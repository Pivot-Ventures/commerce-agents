# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""A thin admin host over fixtures: listing approve/reject (New → published),
stores, haulage agents, customers, payouts (visible, never paid from here),
a haulage desk (attach agent, assigned orders), shipping, and roles.
Every write that would move money is refused."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from demo_common.storefront_fixtures import load_json
from shopping_agent import ProductDetails, Unavailable

from .desk_auth import SessionCredentials, desk_auth
from .mock_equipaccess import DATA_DIR, MockEquipAccess

ADMIN_USER = "admin-user"

# Extra New listings so the approvals desk matches the review-queue density
# of the mock without repeating the four detailed rows in admin.json.
_DESK_LISTINGS: list[tuple[str, str, str, str, str, str, int]] = [
    (
        "AE-PND-305",
        "ACME Lift Skid Steer",
        "Rent",
        "ACME Plant Hire Mukono",
        "Mukono, Uganda",
        "Loaders",
        95_000,
    ),
    (
        "AE-PND-306",
        "ACME Iron 8-ton Mini Excavator",
        "Rent",
        "ACME Yard Kampala",
        "Kampala, Uganda",
        "Construction equipment",
        110_000,
    ),
    (
        "AE-PND-307",
        "ACME Haul Water Bowser",
        "Rent",
        "ACME Shore Entebbe",
        "Entebbe, Uganda",
        "Trucks",
        80_000,
    ),
    (
        "AE-PND-308",
        "ACME Power Tower Lights",
        "Rent",
        "ACME East Jinja",
        "Jinja, Uganda",
        "Power",
        35_000,
    ),
    (
        "AE-PND-309",
        "ACME Mix Concrete Pump (used)",
        "Sale",
        "ACME Yard Kampala",
        "Kampala, Uganda",
        "Construction equipment",
        18_500_000,
    ),
    (
        "AE-PND-310",
        "ACME Access Scissor Lift",
        "Rent",
        "ACME Plant Hire Mukono",
        "Mukono, Uganda",
        "Access & safety",
        55_000,
    ),
    (
        "AE-PND-311",
        "ACME Pack Trench Roller",
        "Rent",
        "ACME East Jinja",
        "Jinja, Uganda",
        "Construction equipment",
        70_000,
    ),
    (
        "AE-PND-312",
        "ACME Iron Hydraulic Breaker",
        "Sale",
        "ACME Yard Kampala",
        "Kampala, Uganda",
        "Construction equipment",
        4_200_000,
    ),
]


def _desk_listing(
    listing_id: str,
    title: str,
    kind: str,
    store: str,
    location: str,
    category: str,
    price: int,
    submitted: str,
) -> dict[str, Any]:
    return {
        "listing_id": listing_id,
        "store": store,
        "location": location,
        "type": kind,
        "submitted": submitted,
        "status": "pending",
        "store_status": "New",
        "published": False,
        "category": category,
        "product": {
            "product_id": listing_id,
            "title": title,
            "brand": "ACME",
            "price": price,
            "currency": "UGX",
            "category": category.lower(),
            "in_stock": True,
            "short_description": f"A {kind.lower()} listing waiting on admin publish.",
            "attributes": {
                "listing_type": kind,
                "listing_status": "pending",
                "yard": store,
                "location": location.split(",")[0],
            },
        },
    }


class ListingDecision(BaseModel):
    note: str | None = Field(default=None, max_length=400)


class AttachAgent(BaseModel):
    agent_id: str = Field(min_length=1, max_length=40)


def load_admin() -> dict[str, Any]:
    return load_json(DATA_DIR, "admin.json")


def create_admin_router(storefront: MockEquipAccess, host: Any) -> APIRouter:
    """Admin routes share the storefront session store so the demo contract stays
    one identity resolver. ``POST /api/admin/session`` mints a session for the
    fixture admin profile. Email and password, when sent, must match an active
    admin desk account."""
    router = APIRouter()
    state = load_admin()
    pending: list[dict[str, Any]] = list(state.get("pending_listings") or [])
    if not any(row.get("listing_id") == "AE-PND-305" for row in pending):
        for index, row in enumerate(_DESK_LISTINGS):
            pending.append(
                _desk_listing(
                    *row,
                    submitted=f"2026-08-{28 + (index % 4):02d}T{9 + index:02d}:12:00Z",
                )
            )

    @router.post("/session")
    async def start_session(request: SessionCredentials | None = None) -> dict:
        if request is not None and (request.email or request.password):
            account = desk_auth.verify("admin", request.email, request.password)
            record = host.sessions.start(account.user_id)
            return {
                "session_id": record.session_id,
                "user_id": account.user_id,
                "name": account.name,
                "role": "super_admin",
                "org": account.org or "BTIC",
            }
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
        row["published"] = True
        row["store_status"] = "Approved"
        product = ProductDetails.model_validate(row["product"])
        product.attributes = {
            **product.attributes,
            "listing_status": "approved",
            "published": "true",
        }
        storefront.products[product.product_id] = product
        return {"ok": True, "listing_id": listing_id, "status": "approved", "published": True}

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
        row["published"] = False
        row["store_status"] = "Rejected"
        return {"ok": True, "listing_id": listing_id, "status": "rejected", "published": False}

    @router.get("/stores")
    async def stores(record: host.CurrentSession) -> dict:
        del record
        return {
            "stores": state.get("stores") or [],
            "applications": desk_auth.pending_stores(),
        }

    @router.post("/store-applications/{application_id}/approve")
    async def approve_store_application(application_id: str, record: host.CurrentSession) -> dict:
        if record.user_id != ADMIN_USER:
            raise HTTPException(status_code=403, detail="Admin session required")
        return desk_auth.approve_store(application_id)

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

    @router.get("/haulage-desk")
    async def haulage_desk(record: host.CurrentSession, agent_id: str | None = None) -> dict:
        del record
        queue = storefront.haulage_queue()
        assigned = storefront.assigned_hires(agent_id)
        return {
            "queue": queue,
            "assigned": assigned,
            "agents": state.get("agents") or [],
            "note": (
                "Admin attaches a haulage agent (packing yard, transport). "
                "Paying shipping is refused here — the model cannot move money."
            ),
        }

    @router.post("/hires/{hire_id}/attach-agent")
    async def attach_agent(hire_id: str, request: AttachAgent, record: host.CurrentSession) -> dict:
        if record.user_id != ADMIN_USER:
            raise HTTPException(status_code=403, detail="Admin session required")
        agents = {row["agent_id"] for row in state.get("agents") or []}
        if request.agent_id not in agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        try:
            hire = storefront.attach_agent(hire_id, request.agent_id)
        except Unavailable as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True, "hire_id": hire.hire_id, "agent_id": hire.agent_id}

    @router.post("/hires/{hire_id}/pay-shipping")
    async def pay_shipping(hire_id: str, record: host.CurrentSession) -> dict:
        del record
        raise HTTPException(
            status_code=403,
            detail=f"{hire_id}: shipping cannot be paid from this host or the model.",
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
