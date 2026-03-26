$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[start-local] $Message"
}

function Test-ContainerRuntime {
    param([string]$Runtime)

    try {
        & $Runtime ps | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Get-ContainerRuntime {
    foreach ($runtime in @("podman", "docker")) {
        if (-not (Get-Command $runtime -ErrorAction SilentlyContinue)) {
            continue
        }
        if (Test-ContainerRuntime -Runtime $runtime) {
            return $runtime
        }
        Write-Step "$runtime is installed but not connected. Trying next available runtime."
    }
    throw "No working container runtime was detected. Ensure podman or docker is installed and running."
}

function Invoke-Compose {
    param(
        [string]$Runtime,
        [string[]]$Arguments,
        [string]$ComposeFile
    )

    & $Runtime compose -f $ComposeFile @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Compose command failed: $Runtime compose -f $ComposeFile $($Arguments -join ' ')"
    }
}

function Invoke-ContainerCommand {
    param(
        [string]$Runtime,
        [string]$ContainerName,
        [string[]]$Arguments
    )

    $output = & $Runtime exec $ContainerName @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Container command failed in ${ContainerName}: $($Arguments -join ' ')"
    }
    return ($output | Out-String).Trim()
}

function Wait-ContainerHealth {
    param(
        [string]$Runtime,
        [string]$ContainerName,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $status = (& $Runtime inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $ContainerName 2>$null | Out-String).Trim()
        if ($status -eq "healthy" -or $status -eq "running") {
            return
        }
        Start-Sleep -Seconds 2
    }

    throw "Container $ContainerName did not become healthy within $TimeoutSeconds seconds."
}

function Wait-HttpReady {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 120,
        [switch]$ExpectReadyPayload
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            if ($ExpectReadyPayload) {
                $response = Invoke-RestMethod -Uri $Url -TimeoutSec 5
                $isReady = $false
                if ($null -ne $response.ready -and [bool]$response.ready) {
                    $isReady = $true
                } elseif ($null -ne $response.ok -and [bool]$response.ok) {
                    $isReady = $true
                } elseif ($null -ne $response.status -and @("ready", "degraded") -contains "$($response.status)".ToLowerInvariant()) {
                    $isReady = $true
                } elseif ($null -ne $response.startup -and $response.startup.state -eq "ready") {
                    $isReady = $true
                }
                if ($isReady) {
                    return $response
                }
            } else {
                $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                    return $response
                }
            }
        } catch {
        }
        Start-Sleep -Seconds 2
    }

    throw "Endpoint $Url did not report ready within $TimeoutSeconds seconds."
}

function Ensure-FileFromExample {
    param(
        [string]$TargetPath,
        [string]$ExamplePath
    )

    if (-not (Test-Path -LiteralPath $TargetPath)) {
        Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath
        Write-Step "Created $TargetPath from template."
    }
}

function Get-EnvMap {
    param([string]$Path)

    $map = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) {
            continue
        }
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $map[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
    return $map
}

function Ensure-ComposeDatabase {
    param(
        [string]$Runtime,
        [hashtable]$EnvMap
    )

    $dbName = $EnvMap["POSTGRES_DB"]
    $dbUser = $EnvMap["POSTGRES_USER"]
    if (-not $dbName -or -not $dbUser) {
        throw "POSTGRES_DB and POSTGRES_USER must be set in .env."
    }

    $checkSql = "SELECT 1 FROM pg_database WHERE datname = '$dbName';"
    $exists = Invoke-ContainerCommand -Runtime $Runtime -ContainerName "fca-postgres" -Arguments @(
        "psql", "-U", $dbUser, "-d", "postgres", "-tAc", $checkSql
    )

    if ($exists -ne "1") {
        Write-Step "Database '$dbName' is missing. Creating it now."
        Invoke-ContainerCommand -Runtime $Runtime -ContainerName "fca-postgres" -Arguments @(
            "psql", "-U", $dbUser, "-d", "postgres", "-c", "CREATE DATABASE `"$dbName`";"
        ) | Out-Null
    } else {
        Write-Step "Database '$dbName' already exists."
    }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot
$composeFile = Join-Path $repoRoot "compose.yaml"

$runtime = Get-ContainerRuntime
Write-Step "Using container runtime: $runtime"

Ensure-FileFromExample -TargetPath ".env" -ExamplePath ".env.example"
Ensure-FileFromExample -TargetPath "frontend/.env.local" -ExamplePath "frontend/.env.example"

$envMap = Get-EnvMap -Path ".env"
$apiPort = if ($envMap.ContainsKey("API_PORT")) { $envMap["API_PORT"] } else { "8000" }
$frontendPort = if ($envMap.ContainsKey("FRONTEND_PORT")) { $envMap["FRONTEND_PORT"] } else { "3000" }

try {
    Write-Step "Starting infrastructure containers."
    Invoke-Compose -Runtime $runtime -ComposeFile $composeFile -Arguments @("up", "-d", "postgres")

    Write-Step "Waiting for PostgreSQL health checks."
    Wait-ContainerHealth -Runtime $runtime -ContainerName "fca-postgres"

    Write-Step "Ensuring the target database exists."
    Ensure-ComposeDatabase -Runtime $runtime -EnvMap $envMap

    Write-Step "Starting API, worker, and frontend containers."
    Invoke-Compose -Runtime $runtime -ComposeFile $composeFile -Arguments @("up", "-d", "--build", "api", "worker", "frontend")

    Write-Step "Waiting for API container health."
    Wait-ContainerHealth -Runtime $runtime -ContainerName "fca-api"

    $apiStatus = Invoke-ContainerCommand -Runtime $runtime -ContainerName "fca-api" -Arguments @(
        "python",
        "-c",
        "import json, urllib.request; r=json.loads(urllib.request.urlopen('http://127.0.0.1:8000/ready', timeout=5).read().decode()); print(r.get('status','ready'))"
    )

    Write-Step "Waiting for frontend container health."
    Wait-ContainerHealth -Runtime $runtime -ContainerName "fca-frontend"

    Write-Host ""
    Write-Host "Startup complete."
    Write-Host "Frontend: http://localhost:$frontendPort"
    Write-Host "API ready: http://localhost:$apiPort/ready"
    Write-Host ""
    Write-Host "Status summary: $apiStatus"
    if ($apiStatus -eq "degraded") {
        Write-Host "Dependency warnings were detected. Check /ready for details."
    }
} catch {
    Write-Error $_
    Write-Host ""
    Write-Host "Troubleshooting:"
    Write-Host "1. Check container status with '$runtime compose -f compose.yaml ps'."
    Write-Host "2. Inspect API readiness at http://localhost:$apiPort/ready once the API container is up."
    Write-Host "3. Review the runbook in docs/19_STARTUP_TROUBLESHOOTING.md."
    exit 1
}
