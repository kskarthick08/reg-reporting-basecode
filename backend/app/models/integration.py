from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UniqueConstraint, func

from app.db import Base


class GitHubIntegrationConfig(Base):
    __tablename__ = "github_integration_configs"
    __table_args__ = (UniqueConstraint("project_id", name="uq_github_integration_project"),)

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(100), index=True, nullable=False)
    repo_url = Column(Text, nullable=False)
    repo_owner = Column(String(120), nullable=False)
    repo_name = Column(String(200), nullable=False)
    branch = Column(String(120), nullable=False, server_default="main")
    base_path = Column(String(255), nullable=False, server_default="")
    token = Column(Text, nullable=True)
    enabled = Column(Boolean, nullable=False, server_default="false")
    updated_by = Column(String(120), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
