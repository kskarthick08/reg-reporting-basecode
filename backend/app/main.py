import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models_gate_config import GateConfiguration
from app.models_integration import GitHubIntegrationConfig
from app.paths import ARTIFACT_ROOT, DATA_ROOT
from app.routes.admin_routes import router as admin_router
from app.routes.gate_config_routes import router as gate_config_router
from app.routes.integration_routes import router as integration_router
from app.routes.artifact_routes import router as artifact_router
from app.routes.ba_routes import router as ba_router
from app.routes.dev_routes import router as dev_router
from app.routes.job_routes import router as job_router
from app.routes.logging_routes import router as logging_router
from app.routes.manager_routes import router as manager_router
from app.routes.rag_routes import router as rag_router
from app.routes.reviewer_routes import router as reviewer_router
from app.routes.system_routes import router as system_router
from app.services.runtime_health_service import run_startup_sequence
from app.workflow_routes import router as workflow_router

app = FastAPI(title="FCA Local Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system_router)
app.include_router(rag_router)
app.include_router(artifact_router)
app.include_router(admin_router)
app.include_router(gate_config_router)
app.include_router(integration_router)
app.include_router(logging_router)
app.include_router(job_router)
app.include_router(ba_router)
app.include_router(dev_router)
app.include_router(reviewer_router)
app.include_router(workflow_router)
app.include_router(manager_router)


@app.on_event("startup")
def startup():
    """Initialize application startup tasks and runtime dependencies."""
    level = getattr(logging, str(settings.app_log_level or "INFO").upper(), logging.INFO)
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(
            level=level,
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )
    else:
        root.setLevel(level)

    run_startup_sequence(DATA_ROOT, ARTIFACT_ROOT)
