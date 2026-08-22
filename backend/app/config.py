"""Sworna CBDC backend configuration.

Settings are read from environment variables with sensible defaults for the
all-in-one dev setup on the central-bank host.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    issuer_url: str = os.getenv("SWORNA_ISSUER_URL", "http://localhost:9100/api/v1")
    auditor_url: str = os.getenv("SWORNA_AUDITOR_URL", "http://localhost:9000/api/v1")
    # owner node -> base url of that bank's owner token-service
    owner_nodes: dict = field(
        default_factory=lambda: {
            "owner1": os.getenv("SWORNA_OWNER1_URL", "http://localhost:9200/api/v1"),
            "owner2": os.getenv("SWORNA_OWNER2_URL", "http://localhost:9300/api/v1"),
        }
    )
    database_url: str = os.getenv("SWORNA_DB_URL", "sqlite:///./sworna.db")
    decimals: int = 2


settings = Settings()