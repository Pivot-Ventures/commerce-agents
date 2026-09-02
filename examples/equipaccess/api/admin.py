# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""A thin admin host over fixtures: listing approve/reject, stores, commission
agents, customers, payouts (visible, never paid from here), shipping, and roles.
Every write that would move money is refused."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from demo_common.storefront_fixtures import load_json
from shopping_agent import ProductDetails

from .mock_equipaccess import DATA_DIR, MockEquipAccess

ADMIN_USER = "admin-user"


class ListingDecision(BaseModel):
    note: str | None = Field(default=None, max_length=400)


class PayoutAction(BaseModel):
    payout_id: str = Field(min_length=1, max_length=80)


def load_admin() -> dict[str, Any]:
    return load_json(DATA_DIR, "admin.json")


def create_admin_router(storefront: MockEquipAccess, host: Any) -> APIRouter:
    """Admin routes share the storefront session store so the demo contract stays
    one identity resolver. ``POST /api/admin/session`` mints a session for the
    fixture admin profile."""
    router = APIRouter()
    state = load_admin()
    pending: list[dict[str, Any]] = list(state.get("pending_listings") or [])

    @router.post("/session")
    async def start_session() -> dict:
        record = host.sessions.start(ADMIN_USER)
        return {
            "session_id": record.session_id,
            "user_id": ADMIN_USER,
            "name": "BT",
            "role": "super_admin",
            "org": "BTIC",
        }

    @router.get("/health")
    async def health() -> dict:
        return {
            "store": storefront.store_name,
            "role": "admin",
            "pending_listings": len(pending),
        }

    @router.get("/listings")
    async def listings(record: host.CurrentSession, status: str = "pending") -> dict:
        del record
        wanted = status.strip().lower()
        if wanted == "pending":
            rows = [row for row in pending if row.get("status") == "pending"]
        elif wanted in {"approved", "rejected"}:
            rows = [row for row in pending if row.get("status") == wanted]
        else:
            rows = list(pending)
        return {"listings": rows, "total": len(rows)}

    def _pending(listing_id: str) -> dict[str, Any]:
        for row in pending:
            if row["listing_id"] == listing_id:
                return row
        raise HTTPException(status_code=404, detail="Listing not found")

    @router.post("/listings/{listing_id}/approve")
    async def approve(
        listing_id: str, request: ListingDecision, record: host.CurrentSession
    ) -> dict:
        del request
        if record.user_id != ADMIN_USER:
            raise HTTPException(status_code=403, detail="Admin session required")
        row = _pending(listing_id)
        if row.get("status") != "pending":
            raise HTTPException(status_code=409, detail="Listing is not pending")
        row["status"] = "approved"
        product = ProductDetails.model_validate(row["product"])
        storefront.products[product.product_id] = product
        return {"ok": True, "listing_id": listing_id, "status": "approved"}

    @router.post("/listings/{listing_id}/reject")
    async def reject(
        listing_id: str, request: ListingDecision, record: host.CurrentSession
    ) -> dict:
        del request
        if record.user_id != ADMIN_USER:
            raise HTTPException(status_code=403, detail="Admin session required")
        row = _pending(listing_id)
        if row.get("status") != "pending":
            raise HTTPException(status_code=409, detail="Listing is not pending")
        row["status"] = "rejected"
        return {"ok": True, "listing_id": listing_id, "status": "rejected"}

    @router.get("/stores")
    async def stores(record: host.CurrentSession) -> dict:
        del record
        return {"stores": state.get("stores") or []}

    @router.get("/agents")
    async def agents(record: host.CurrentSession) -> dict:
        del record
        return {"agents": state.get("agents") or []}

    @router.get("/customers")
    async def customers(record: host.CurrentSession) -> dict:
        del record
        return {"customers": state.get("customers") or []}

    @router.get("/payouts")
    async def payouts(record: host.CurrentSession) -> dict:
        del record
        return {
            "payouts": state.get("payouts") or [],
            "note": "Payouts are visible only. The admin host does not move money.",
        }

    @router.post("/payouts/{payout_id}/pay")
    async def pay_payout(payout_id: str, record: host.CurrentSession) -> dict:
        del record
        raise HTTPException(
            status_code=403,
            detail=f"{payout_id}: payouts cannot be executed from this host or the model.",
        )

    @router.get("/shipping")
    async def shipping(record: host.CurrentSession) -> dict:
        del record
        return {"lanes": state.get("shipping") or []}

    @router.get("/roles")
    async def roles(record: host.CurrentSession) -> dict:
        del record
        return {"roles": state.get("roles") or []}

    @router.get("/overview")
    async def overview(record: host.CurrentSession) -> dict:
        del record
        return {
            "pending_listings": sum(1 for row in pending if row.get("status") == "pending"),
            "haulage_reviews": len(storefront.haulage_queue()),
            "payouts_held": sum(
                1 for row in state.get("payouts") or [] if row.get("status") == "held"
            ),
            "stores": len(state.get("stores") or []),
            "agents": len(state.get("agents") or []),
        }

    return router
