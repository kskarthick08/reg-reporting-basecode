"""
Output validation service for AI agent responses.

Validates agent outputs against expected schemas and business rules.
"""
from typing import Any
from dataclasses import dataclass
import logging

logger = logging.getLogger("app.validation")


@dataclass
class ValidationResult:
    """Result of output validation."""
    is_valid: bool
    confidence_score: float
    errors: list[str]
    warnings: list[str]
    metadata: dict[str, Any]


def validate_dev_output(output: dict) -> ValidationResult:
    """
    Validate DEV agent SQL generation output.
    
    Checks:
    - Required keys present
    - SQL script is valid string
    - Reasoning includes confidence score
    - Validation section present
    """
    errors = []
    warnings = []
    
    # Check required keys
    required = ["reasoning", "validation", "sql_script", "summary", "key_steps", 
                "output_specification", "validation_plan", "deployment_notes"]
    missing = [k for k in required if k not in output]
    if missing:
        errors.append(f"Missing required keys: {missing}")
    
    # Check SQL script
    sql = output.get("sql_script", "")
    if not sql or not isinstance(sql, str):
        errors.append("sql_script must be non-empty string")
    elif not sql.strip():
        errors.append("sql_script cannot be empty or whitespace only")
    else:
        sql_upper = sql.strip().upper()
        if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
            errors.append("sql_script must be read-only (start with SELECT or WITH)")
        
        # Check for dangerous keywords
        dangerous_keywords = ["DROP", "DELETE", "TRUNCATE", "INSERT", "UPDATE", "CREATE", "ALTER"]
        for keyword in dangerous_keywords:
            if keyword in sql_upper:
                errors.append(f"sql_script contains forbidden keyword: {keyword}")
    
    # Check reasoning structure
    reasoning = output.get("reasoning", {})
    if not isinstance(reasoning, dict):
        errors.append("reasoning must be object")
    else:
        confidence = reasoning.get("confidence_score")
        if confidence is None:
            warnings.append("No confidence_score in reasoning")
        elif not isinstance(confidence, (int, float)):
            errors.append("confidence_score must be numeric")
        elif not (0 <= confidence <= 1):
            errors.append("confidence_score must be between 0.0 and 1.0")
        
        # Check reasoning fields
        if not reasoning.get("approach"):
            warnings.append("reasoning.approach is empty")
        if not reasoning.get("key_decisions"):
            warnings.append("reasoning.key_decisions is empty")
    
    # Check validation section
    validation = output.get("validation", {})
    if not isinstance(validation, dict):
        errors.append("validation must be object")
    else:
        schema_check = validation.get("schema_check")
        if schema_check not in ["passed", "failed", None]:
            warnings.append("validation.schema_check should be 'passed' or 'failed'")
        
        coverage_check = validation.get("coverage_check")
        if coverage_check not in ["passed", "failed", None]:
            warnings.append("validation.coverage_check should be 'passed' or 'failed'")
    
    # Extract confidence score
    confidence = 0.0
    if isinstance(reasoning, dict):
        conf_val = reasoning.get("confidence_score", 0.0)
        if isinstance(conf_val, (int, float)):
            confidence = float(conf_val)
    
    return ValidationResult(
        is_valid=len(errors) == 0,
        confidence_score=confidence,
        errors=errors,
        warnings=warnings,
        metadata={
            "sql_length": len(sql) if isinstance(sql, str) else 0,
            "has_reasoning": bool(reasoning),
            "has_validation": bool(validation),
            "schema_check": validation.get("schema_check") if isinstance(validation, dict) else None,
            "coverage_check": validation.get("coverage_check") if isinstance(validation, dict) else None,
        }
    )


def validate_reviewer_output(output: dict) -> ValidationResult:
    """
    Validate Reviewer agent XML generation output.
    
    Checks:
    - Required keys present
    - XML report is valid string
    - Reasoning includes confidence score
    - Validation section present
    """
    errors = []
    warnings = []
    
    # Check required keys
    required = ["reasoning", "validation", "xml_report", "summary", 
                "gap_fit_analysis", "supporting_notes", "next_steps"]
    missing = [k for k in required if k not in output]
    if missing:
        errors.append(f"Missing required keys: {missing}")
    
    # Check XML report
    xml = output.get("xml_report", "")
    if not xml or not isinstance(xml, str):
        errors.append("xml_report must be non-empty string")
    elif not xml.strip():
        errors.append("xml_report cannot be empty or whitespace only")
    else:
        xml_stripped = xml.strip()
        if not xml_stripped.startswith("<"):
            errors.append("xml_report must start with XML tag")
        if not xml_stripped.endswith(">"):
            errors.append("xml_report must end with XML tag")
        
        # Basic well-formedness check (balanced tags)
        open_count = xml_stripped.count("<")
        close_count = xml_stripped.count(">")
        if open_count != close_count:
            warnings.append(f"XML may be malformed: {open_count} '<' vs {close_count} '>'")
    
    # Check reasoning structure
    reasoning = output.get("reasoning", {})
    if not isinstance(reasoning, dict):
        errors.append("reasoning must be object")
    else:
        confidence = reasoning.get("confidence_score")
        if confidence is None:
            warnings.append("No confidence_score in reasoning")
        elif not isinstance(confidence, (int, float)):
            errors.append("confidence_score must be numeric")
        elif not (0 <= confidence <= 1):
            errors.append("confidence_score must be between 0.0 and 1.0")
        
        # Check reasoning fields
        if not reasoning.get("approach"):
            warnings.append("reasoning.approach is empty")
        if not reasoning.get("xsd_compliance_check"):
            warnings.append("reasoning.xsd_compliance_check is empty")
    
    # Check validation section
    validation = output.get("validation", {})
    if not isinstance(validation, dict):
        errors.append("validation must be object")
    else:
        for check in ["root_element_check", "namespace_check", "required_fields_check"]:
            value = validation.get(check)
            if value not in ["passed", "failed", None]:
                warnings.append(f"validation.{check} should be 'passed' or 'failed'")
    
    # Extract confidence score
    confidence = 0.0
    if isinstance(reasoning, dict):
        conf_val = reasoning.get("confidence_score", 0.0)
        if isinstance(conf_val, (int, float)):
            confidence = float(conf_val)
    
    return ValidationResult(
        is_valid=len(errors) == 0,
        confidence_score=confidence,
        errors=errors,
        warnings=warnings,
        metadata={
            "xml_length": len(xml) if isinstance(xml, str) else 0,
            "has_reasoning": bool(reasoning),
            "has_validation": bool(validation),
            "root_element_check": validation.get("root_element_check") if isinstance(validation, dict) else None,
            "namespace_check": validation.get("namespace_check") if isinstance(validation, dict) else None,
            "required_fields_check": validation.get("required_fields_check") if isinstance(validation, dict) else None,
        }
    )


def log_validation_result(agent_type: str, request_id: str, result: ValidationResult) -> None:
    """Log validation result for monitoring."""
    if result.is_valid:
        logger.info(
            f"Validation passed for {agent_type}",
            extra={
                "agent_type": agent_type,
                "request_id": request_id,
                "confidence_score": result.confidence_score,
                "warnings_count": len(result.warnings),
                "metadata": result.metadata,
            }
        )
    else:
        logger.error(
            f"Validation failed for {agent_type}",
            extra={
                "agent_type": agent_type,
                "request_id": request_id,
                "errors": result.errors,
                "warnings": result.warnings,
                "confidence_score": result.confidence_score,
                "metadata": result.metadata,
            }
        )
