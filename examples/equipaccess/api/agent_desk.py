# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Haulage-agent desk: provisioned login, assigned hires, and close-delivery.

Agents are logistics accounts (packing yard, transport). Admin attaches them to a
hire. This host does not pay them. Sessions share the storefront identity store so
the demo contract stays one resolver; writes still key off the agent user id."""

from typing import Any

from fastapi import APIRouter, HTTPException

from shopping_agent import Unavailable

from .desk_auth import SessionCredentials, desk_auth
from .mock_equipaccess import MockEquipAccess


def create_agent_router(storefront: MockEquipAccess, host: Any) -> APIRouter:
    router = APIRouter()

    @router.post("/session")
    async def start_session(request: SessionCredentials | None = None) -> dict:
        account = desk_auth.verify(
            "agent",
            request.email if request else None,
            request.password if request else None,
        )
        record = host.sessions.start(account.user_id)
        return {
            "session_id": record.session_id,
            "user_id": account.user_id,
            "name": account.name,
            "role": "agent",
        }

    @router.get("/health")
    async def health() -> dict:
        return {"ok": True, "role": "agent", "store": storefront.store_name}

    @router.get("/desk")
    async def desk(record: host.CurrentSession) -> dict:
        assigned = storefront.assigned_hires(record.user_id)
        return {
            "agent_id": record.user_id,
            "assigned": assigned,
            "note": "Assigned hires for this haulage agent. Closing a delivery does not move money.",
        }

    @router.post("/hires/{hire_id}/close")
    async def close_hire(hire_id: str, record: host.CurrentSession) -> dict:
        try:
            hire = storefront.close_delivery(hire_id, record.user_id)
        except Unavailable as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {
            "ok": True,
            "hire_id": hire.hire_id,
            "status": hire.status,
            "agent_id": hire.agent_id,
        }

    return router
