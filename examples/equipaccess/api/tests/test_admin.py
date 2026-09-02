# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

from demo_common import SESSION_HEADER


def test_admin_approves_and_rejects_and_refuses_payouts(client):
    started = client.post("/api/admin/session").json()
    headers = {SESSION_HEADER: started["session_id"]}
    pending = client.get("/api/admin/listings", headers=headers, params={"status": "pending"}).json()
    assert pending["total"] >= 3
    first = pending["listings"][0]["listing_id"]
    approved = client.post(f"/api/admin/listings/{first}/approve", json={}, headers=headers)
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    second = pending["listings"][1]["listing_id"]
    rejected = client.post(f"/api/admin/listings/{second}/reject", json={}, headers=headers)
    assert rejected.json()["status"] == "rejected"
    stores = client.get("/api/admin/stores", headers=headers).json()["stores"]
    agents = client.get("/api/admin/agents", headers=headers).json()["agents"]
    assert stores and agents
    payouts = client.get("/api/admin/payouts", headers=headers).json()
    assert payouts["payouts"]
    pay = client.post("/api/admin/payouts/PO-88/pay", json={}, headers=headers)
    assert pay.status_code == 403
    health = client.get("/api/admin/health").json()
    assert health["role"] == "admin"


def test_admin_writes_need_the_admin_session(client, shopper):
    headers = shopper()
    pending = client.get("/api/admin/listings", headers=headers).json()["listings"]
    listing_id = pending[0]["listing_id"]
    denied = client.post(f"/api/admin/listings/{listing_id}/approve", json={}, headers=headers)
    assert denied.status_code == 403
