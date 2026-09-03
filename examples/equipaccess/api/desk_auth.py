# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Fixture desk accounts for the admin, store, and haulage-agent logins.

Passwordless ``POST /session`` on admin and merchant stays for the demo contract.
The login screens send email and password; a mismatch is a 401. Store applications
wait on admin approval before they can sign in."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field

from demo_common.storefront_fixtures import load_json

from .mock_equipaccess import DATA_DIR

UNRECOGNIZED = "Email or password is not recognized."
PENDING = "This store account is waiting on admin approval."


class SessionCredentials(BaseModel):
    email: str | None = Field(default=None, max_length=120)
    password: str | None = Field(default=None, max_length=120)


class StoreApplicationRequest(BaseModel):
    store_name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=120)
    location: str = Field(min_length=2, max_length=80)


@dataclass
class DeskAccount:
    email: str
    password: str
    role: str
    user_id: str
    name: str
    org: str | None = None
    store: str | None = None
    location: str | None = None
    status: str = "active"
    application_id: str | None = None


@dataclass
class DeskAuth:
    """In-process accounts plus pending store applications."""

    accounts: list[DeskAccount] = field(default_factory=list)
    applications: list[dict[str, Any]] = field(default_factory=list)
    _seq: int = 100

    def verify(self, role: str, email: str | None, password: str | None) -> DeskAccount:
        if not email or not password:
            raise HTTPException(status_code=401, detail=UNRECOGNIZED)
        wanted = email.strip().lower()
        for account in self.accounts:
            if account.email.lower() != wanted:
                continue
            if account.role != role or account.password != password:
                raise HTTPException(status_code=401, detail=UNRECOGNIZED)
            if account.status != "active":
                raise HTTPException(status_code=403, detail=PENDING)
            return account
        raise HTTPException(status_code=401, detail=UNRECOGNIZED)

    def apply_store(self, request: StoreApplicationRequest) -> dict[str, Any]:
        email = request.email.strip().lower()
        if any(account.email.lower() == email for account in self.accounts):
            raise HTTPException(status_code=409, detail="That email already has a desk account.")
        self._seq += 1
        application_id = f"SA-{self._seq}"
        account = DeskAccount(
            email=email,
            password=request.password,
            role="store",
            user_id=f"store-{self._seq}",
            name=request.store_name.strip(),
            store=request.store_name.strip(),
            location=request.location.strip(),
            status="pending",
            application_id=application_id,
        )
        self.accounts.append(account)
        row = {
            "application_id": application_id,
            "store_name": account.store,
            "email": account.email,
            "location": account.location,
            "status": "pending",
        }
        self.applications.append(row)
        return {
            **row,
            "note": "Your store account is waiting on admin approval.",
        }

    def pending_stores(self) -> list[dict[str, Any]]:
        return [row for row in self.applications if row.get("status") == "pending"]

    def approve_store(self, application_id: str) -> dict[str, Any]:
        for row in self.applications:
            if row["application_id"] == application_id:
                if row["status"] != "pending":
                    raise HTTPException(status_code=409, detail="Application is not pending")
                row["status"] = "approved"
                for account in self.accounts:
                    if account.application_id == application_id:
                        account.status = "active"
                return {**row, "status": "approved"}
        raise HTTPException(status_code=404, detail="Application not found")


def load_desk_auth() -> DeskAuth:
    rows = load_json(DATA_DIR, "desk_accounts.json").get("accounts") or []
    accounts = [
        DeskAccount(
            email=str(row["email"]),
            password=str(row["password"]),
            role=str(row["role"]),
            user_id=str(row["user_id"]),
            name=str(row["name"]),
            org=row.get("org"),
            store=row.get("store"),
            location=row.get("location"),
            status=str(row.get("status") or "active"),
        )
        for row in rows
    ]
    return DeskAuth(accounts=accounts)


desk_auth = load_desk_auth()
