# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The ACME Equip merchant router: shared portal routes plus haulage-queue and
hire-calendar reads. Approve and counter are host buttons on the queue, not
agent writes that move money."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from commerce_common.memory import MemoryStore
from demo_common import REPO_ROOT, MerchantIdentity, build_merchant_router
from merchant_agent_runtime import MerchantAgent
from shopping_agent import Unavailable

from .agent_config import build_merchant_config
from .desk_auth import desk_auth
from .mock_equipaccess import MockEquipAccess
from .mock_merchant import MockEquipMerchant

IDENTITY = MerchantIdentity(merchant_id="acme-equip", operator="Mercy N.")


def authorize_store_session(request: Any) -> MerchantIdentity | None:
    email = getattr(request, "email", None) if request is not None else None
    password = getattr(request, "password", None) if request is not None else None
    if not email and not password:
        return None
    account = desk_auth.verify("store", email, password)
    return MerchantIdentity(merchant_id=IDENTITY.merchant_id, operator=account.name)


class HaulageCounter(BaseModel):
    quote: float = Field(gt=0)


def create_merchant_router(storefront: MockEquipAccess, memory_store: MemoryStore) -> APIRouter:
    config = build_merchant_config(storefront.store_name)
    merchant = MockEquipMerchant(storefront, config)
    agent = MerchantAgent(
        backend=merchant,
        skills_dir=REPO_ROOT / "merchant-agent" / "skills",
        config=config,
        memory_store=memory_store,
    )

    def extra_routes(router: APIRouter, CurrentSession: Any) -> None:
        @router.post("/haulage/{hire_id}/approve")
        async def approve_haulage(hire_id: str, record: CurrentSession) -> dict:
            del record
            try:
                hire = storefront.approve_haulage(hire_id)
            except Unavailable as error:
                raise HTTPException(status_code=404, detail=str(error)) from error
            return {
                "ok": True,
                "hire_id": hire.hire_id,
                "status": hire.status,
                "quote": hire.haulage_fee,
            }

        @router.post("/haulage/{hire_id}/counter")
        async def counter_haulage(
            hire_id: str, request: HaulageCounter, record: CurrentSession
        ) -> dict:
            del record
            try:
                hire = storefront.counter_haulage(hire_id, request.quote)
            except Unavailable as error:
                raise HTTPException(status_code=404, detail=str(error)) from error
            return {
                "ok": True,
                "hire_id": hire.hire_id,
                "status": hire.status,
                "quote": hire.haulage_fee,
            }

    return build_merchant_router(
        storefront=storefront,
        backend=merchant,
        agent=agent,
        identity=IDENTITY,
        example_dir="equipaccess",
        overview_extras=lambda: {
            "yard": merchant.yard_name,
            "haulage_pending": len(storefront.haulage_queue()),
        },
        portal_reads={
            "/calendar": merchant.hire_calendar,
            "/haulage": lambda: {"queue": storefront.haulage_queue()},
        },
        extra_routes=extra_routes,
        authorize_session=authorize_store_session,
    )
