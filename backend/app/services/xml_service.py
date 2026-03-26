import re
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape as xml_escape
from typing import Any


def xml_root_local_name(xml_text: str) -> str | None:
    """Handle XML root local name within the service layer."""
    try:
        root = ET.fromstring(xml_text.encode("utf-8"))
    except Exception:
        return None
    tag = root.tag or ""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def pick_expected_xsd_root(xsd_hint: dict[str, Any]) -> str | None:
    """Pick expected XSD root within the service layer."""
    root_name = str((xsd_hint or {}).get("root_element") or "").strip()
    if root_name:
        return root_name
    elems = (xsd_hint or {}).get("elements")
    if isinstance(elems, list) and elems:
        first = elems[0]
        if isinstance(first, dict):
            return str(first.get("name") or "").strip() or None
        return str(first).strip() or None
    return None


def build_psd008_xml_from_rows(rows: list[dict[str, Any]], namespace: str) -> str:
    """Build PSD008 XML from rows within the service layer."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<PSD008-CreditAgreementSales xmlns="{xml_escape(namespace)}">',
    ]

    def map_use_type(raw: str) -> str:
        """Handle map use type within the service layer."""
        val = (raw or "").strip().lower()
        if "business" in val:
            return "B"
        if "personal" in val:
            return "P"
        return ""

    def map_earlier_status(raw: str) -> str | None:
        """Handle map earlier status within the service layer."""
        val = (raw or "").strip().lower()
        if val in {"new", "n"}:
            return "N"
        if val in {"existing", "e"}:
            return "E"
        if val in {"unknown", "u"}:
            return "U"
        return None

    for idx, r in enumerate(rows or [], start=1):
        if not isinstance(r, dict):
            continue
        ref = str(r.get("agreement_reference") or r.get("id") or f"AG-{idx:06d}").strip()
        sale_id = str(r.get("sale_identifier") or f"SALE-{idx:06d}").strip()
        use_type = map_use_type(str(r.get("credit_for_business_or_personal_use") or ""))
        earlier_status = map_earlier_status(str(r.get("earlier_agreement_transaction_reference_status") or ""))
        prev_lender_status = str(r.get("previous_lender_regulatory_status") or "").strip().upper()
        amount = str(r.get("amount") or r.get("agreement_amount") or "").strip()
        date = str(r.get("agreement_date") or r.get("date") or "").strip()

        lines.append("  <CreditAgreementSale>")
        lines.append(f"    <AgreementReference>{xml_escape(ref)}</AgreementReference>")
        lines.append(f"    <SaleIdentifier>{xml_escape(sale_id)}</SaleIdentifier>")
        if use_type in {"B", "P"}:
            lines.append(f"    <CreditForBusinessOrPersonalUse>{use_type}</CreditForBusinessOrPersonalUse>")
        if earlier_status:
            lines.append(f"    <EarlierAgreementTransRefStatus>{earlier_status}</EarlierAgreementTransRefStatus>")
        if prev_lender_status in {"A1", "A2", "X", "Z1", "Z2"}:
            lines.append(f"    <PreviousLenderRegulatoryStatus>{prev_lender_status}</PreviousLenderRegulatoryStatus>")
        if re.match(r"^\d+(\.\d+)?$", amount):
            lines.append(f"    <Amount>{amount}</Amount>")
        if date:
            lines.append(f"    <AgreementDate>{xml_escape(date)}</AgreementDate>")
        lines.append("  </CreditAgreementSale>")

    lines.append("</PSD008-CreditAgreementSales>")
    return "\n".join(lines)
