from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    environment: str = "local"
    api_port: int = 8000
    database_url: str = "postgresql+psycopg://fca_user:fca_pass@postgres:5432/fca_app"
    auto_run_migrations: bool = False
    auto_create_schema: bool = True
    startup_probe_timeout_seconds: float = 3.0

    axet_llm_url: str = "https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions"
    axet_llm_model: str = "gpt-5-mini"
    axet_llm_verify_ssl: bool = True
    llm_log_payload: bool = False
    llm_log_max_chars: int = 1200
    app_log_level: str = "INFO"
    ba_log_payload: bool = False
    ba_log_max_chars: int = 1000
    embedding_dim: int = 768
    auto_backfill_rag_embeddings: bool = True
    rag_embedding_backfill_batch_size: int = 2000
    admin_api_key: str = ""
    min_review_coverage_score: float = 80.0


settings = Settings()
