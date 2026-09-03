# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

from demo_common import SESSION_HEADER


def test_admin_login_accepts_fixture_account_and_rejects_bad_password(client):
    ok = client.post(
        "/api/admin/session", json={"email": "bt@acme.equip", "password": "admin-desk"}
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["role"] == "super_admin" and body["name"] == "BT"
    bad = client.post("/api/admin/session", json={"email": "bt@acme.equip", "password": "wrong"})
    assert bad.status_code == 401
    store = client.post(
        "/api/admin/session", json={"email": "mercy@acme.equip", "password": "store-desk"}
    )
    assert store.status_code == 401


def test_store_login_and_pending_register(client):
    ok = client.post(
        "/api/merchant/session",
        json={"email": "mercy@acme.equip", "password": "store-desk"},
    )
    assert ok.status_code == 200
    assert ok.json()["operator"] == "Mercy N."
    bad = client.post(
        "/api/merchant/session",
        json={"email": "mercy@acme.equip", "password": "wrong"},
    )
    assert bad.status_code == 401
    applied = client.post(
        "/api/store/register",
        json={
            "store_name": "ACME Hill Jinja",
            "email": "hill@acme.equip",
            "password": "new-store",
            "location": "Jinja, Uganda",
        },
    )
    assert applied.status_code == 200
    assert applied.json()["status"] == "pending"
    blocked = client.post(
        "/api/merchant/session",
        json={"email": "hill@acme.equip", "password": "new-store"},
    )
    assert blocked.status_code == 403
    admin = client.post("/api/admin/session").json()
    headers = {SESSION_HEADER: admin["session_id"]}
    stores = client.get("/api/admin/stores", headers=headers).json()
    assert any(row["email"] == "hill@acme.equip" for row in stores["applications"])
    approved = client.post(
        f"/api/admin/store-applications/{applied.json()['application_id']}/approve",
        json={},
        headers=headers,
    )
    assert approved.json()["status"] == "approved"
    signed_in = client.post(
        "/api/merchant/session",
        json={"email": "hill@acme.equip", "password": "new-store"},
    )
    assert signed_in.status_code == 200


def test_agent_login_is_provisioned_and_closes_assigned_hire(client):
    missing = client.post("/api/agent/session", json={})
    assert missing.status_code == 401
    started = client.post(
        "/api/agent/session",
        json={"email": "aisha@acme.equip", "password": "agent-desk"},
    )
    assert started.status_code == 200
    assert started.json()["user_id"] == "AG-11"
    headers = {SESSION_HEADER: started.json()["session_id"]}
    desk = client.get("/api/agent/desk", headers=headers).json()
    assert desk["agent_id"] == "AG-11"
    assert any(row["hire_id"] == "HIRE-7804" for row in desk["assigned"])
    closed = client.post("/api/agent/hires/HIRE-7804/close", json={}, headers=headers)
    assert closed.status_code == 200
    assert closed.json()["status"] == "delivered"
    other = client.post(
        "/api/agent/session",
        json={"email": "peter@acme.equip", "password": "agent-desk"},
    )
    stolen = client.post(
        "/api/agent/hires/HIRE-7804/close",
        json={},
        headers={SESSION_HEADER: other.json()["session_id"]},
    )
    assert stolen.status_code == 404
