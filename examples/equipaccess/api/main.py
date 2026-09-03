# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""ACME Equip example API: fixture storefront, merchant portal, and admin host.

uvicorn equipaccess.api.main:app --app-dir examples --reload --port 8004
"""

from datetime import date

from fastapi import HTTPException
from pydantic import BaseModel

from commerce_common.memory import InMemoryMemoryStore
from demo_common import (
    REPO_ROOT,
    CartAddRequest,
    MemorySeeder,
    build_storefront_host,
    load_demo_env,
)
from shopping_agent import Unavailable
from shopping_agent_runtime import ShoppingAgent

from .admin import create_admin_router
from .agent_config import build_shopping_config
from .agent_desk import create_agent_router
from .desk_auth import StoreApplicationRequest, desk_auth
from .http_adapter import build_storefront
from .merchant import create_merchant_router
from .mock_equipaccess import DATA_DIR, HireWindow
from .rates import default_hire_window, normalize_rate_type, parse_iso_date

load_demo_env(DATA_DIR.parent)

backend = build_storefront()
agent = ShoppingAgent(
    backend=backend,
    skills_dir=REPO_ROOT / "shopping-agent" / "skills",
    config=build_shopping_config(),
    memory_store=InMemoryMemoryStore(),
)
host = build_storefront_host(
    title="ACME Equip demo API",
    example_root=DATA_DIR.parent,
    backend=backend,
    agent=agent,
    memory_seeder=MemorySeeder(DATA_DIR / "memory-seed.json"),
    cart_extras=lambda record: (
        backend.cart_extras(record.session_id) if hasattr(backend, "cart_extras") else {}
    ),
)
app = host.app
app.include_router(create_merchant_router(backend, InMemoryMemoryStore()), prefix="/api/merchant")
app.include_router(create_admin_router(backend, host), prefix="/api/admin")
app.include_router(create_agent_router(backend, host), prefix="/api/agent")


@app.post("/api/store/register")
async def register_store(request: StoreApplicationRequest) -> dict:
    return desk_auth.apply_store(request)


class HireWindowRequest(BaseModel):
    start_date: str | None = None
    end_date: str | None = None
    rate_type: str | None = None
    site_location: str | None = None
    distance_km: float | None = None
    include_haulage: bool = False


@app.post("/api/cart/add")
async def cart_add(request: CartAddRequest, record: host.CurrentSession) -> dict:
    product = backend.product(request.product_id)
    if product is not None:
        record.state.remember_products([product])
        host.sessions.save(record)
    return await host.direct_add(
        record,
        request,
        note="Customer tapped add on {title} ({product_id}), quantity {quantity}.",
    )


@app.post("/api/hire/window")
async def set_hire_window(request: HireWindowRequest, record: host.CurrentSession) -> dict:
    if not hasattr(backend, "note_hire_window"):
        raise HTTPException(status_code=501, detail="Hire window is fixture-only")
    start = parse_iso_date(request.start_date)
    end = parse_iso_date(request.end_date)
    existing = backend.hire_window(record.session_id)
    if start is None or end is None:
        if existing is not None:
            start, end = existing.start, existing.end
        else:
            start, end = default_hire_window(getattr(backend, "today", None) or date.today())
    backend.note_hire_window(
        record.session_id,
        HireWindow(
            start=start,
            end=end,
            rate_type=normalize_rate_type(
                request.rate_type or (existing.rate_type if existing else None)
            ),
            site_location=request.site_location or (existing.site_location if existing else None),
            distance_km=request.distance_km
            if request.distance_km is not None
            else (existing.distance_km if existing else None),
            include_haulage=request.include_haulage
            or (existing.include_haulage if existing else False),
        ),
    )
    return {"ok": True, **backend.cart_extras(record.session_id)}


@app.post("/api/hire/request")
async def request_hire(record: host.CurrentSession) -> dict:
    if not hasattr(backend, "request_hire"):
        raise HTTPException(status_code=501, detail="Hire request is fixture-only")
    try:
        hire = backend.request_hire(host.context(record))
    except Unavailable as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    record.pending_app_events.append(
        f"Customer requested hire {hire.hire_id}. Nothing was charged. "
        f"Status: {hire.status.replace('_', ' ')}."
    )
    return {
        "ok": True,
        "charged": False,
        "hire": {
            "hire_id": hire.hire_id,
            "status": hire.status,
            "subtotal": hire.subtotal,
            "haulage_fee": hire.haulage_fee,
            "deposit": hire.deposit,
            "total": hire.total,
            "currency": hire.currency,
            "note": hire.note,
        },
    }
