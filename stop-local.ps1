$ErrorActionPreference = "Stop"

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
    }
    throw "No working container runtime was detected. Ensure podman or docker is installed and running."
}

$runtime = Get-ContainerRuntime
& $runtime compose -f compose.yaml down
exit $LASTEXITCODE
