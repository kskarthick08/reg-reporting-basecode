"""
Gate Configuration Models
Stores configurable gate settings for workflow stages.
"""
from sqlalchemy import JSON, Boolean, Column, DateTime, Float, Integer, String, func

from app.db import Base


class GateConfiguration(Base):
    """
    Stores gate configuration per project and stage.
    Admin can enable/disable gates and adjust thresholds.
    """

    __tablename__ = "gate_configurations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(100), index=True, nullable=False)
    stage = Column(String(40), index=True, nullable=False)  # BA, DEV, REVIEWER
    gate_enabled = Column(Boolean, nullable=False, server_default="true")
    
    # BA Gate Settings
    allow_unresolved_missing = Column(Boolean, nullable=False, server_default="false")
    allow_degraded_quality = Column(Boolean, nullable=False, server_default="false")
    
    # DEV Gate Settings
    require_sql_validation = Column(Boolean, nullable=False, server_default="true")
    require_xml_artifact = Column(Boolean, nullable=False, server_default="true")
    
    # REVIEWER Gate Settings
    min_coverage_score = Column(Float, nullable=False, server_default="0.85")
    require_xsd_validation = Column(Boolean, nullable=False, server_default="true")
    require_rule_checks = Column(Boolean, nullable=False, server_default="true")
    
    # Metadata
    updated_by = Column(String(120), nullable=True)
    custom_config_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
