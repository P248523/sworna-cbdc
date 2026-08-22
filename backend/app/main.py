"""Sworna CBDC banking backend (FastAPI)."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import SessionLocal, engine
from .models import Base
from .routers import admin, auth, payments, registry
from .seed import seed
from .token_client import token_client


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed(session)
    yield
    await token_client.aclose()


app = FastAPI(
    title="Sworna CBDC - Banking API",
    version="0.1.0",
    description="Banking registry + payment proxy over the Sworna token network.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; tighten for the lab demo
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(registry.router)
app.include_router(payments.router)
app.include_router(admin.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}