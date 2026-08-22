"""Account-number helpers."""
from __future__ import annotations

ACCOUNT_NUMBER_LEN = 8  # digits after the bank code


def generate_account_number(bank_code: str, seq: int) -> str:
    """Build a public account number: SWR-<bankcode>-<8 digits>."""
    return f"SWR-{bank_code}-{seq:0{ACCOUNT_NUMBER_LEN}d}"


def parse_account_number(account_number: str) -> tuple[str, str] | None:
    """Split 'SWR-001-00001234' into (bank_code, seq); None if malformed."""
    parts = account_number.strip().split("-")
    if len(parts) != 3 or parts[0] != "SWR":
        return None
    bank_code, seq = parts[1], parts[2]
    if not bank_code.isdigit() or not seq.isdigit():
        return None
    return bank_code, seq