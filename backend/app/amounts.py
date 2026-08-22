"""Amount helpers.

The token services carry integer quantities (minor units). The banking API
works in major units of SWR with `settings.decimals` decimal places.
"""
from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from .config import settings


def to_minor(swr: Decimal) -> int:
    """Convert major units (e.g. 123.45 SWR) to integer minor units."""
    scale = Decimal(10) ** settings.decimals
    return int((swr * scale).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def to_swr(minor: int) -> Decimal:
    """Convert integer minor units to major units (SWR)."""
    scale = Decimal(10) ** settings.decimals
    return Decimal(minor) / scale