# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

from demo_common.tests.fixtures import start_operator, start_shopper


def test_seed_hire_is_on_the_haulage_queue(client):
    headers = start_operator(client)
    queue = client.get("/api/merchant/haulage", headers=headers).json()["queue"]
    assert any(row["hire_id"] == "HIRE-7821" for row in queue)
    calendar = client.get("/api/merchant/calendar", headers=headers).json()
    assert calendar["days"] and calendar["listings"]
    assert calendar["days"][0]["on_hire"] + calendar["days"][0]["free"] == calendar["days"][0]["fleet"]


def test_customer_hire_lands_in_merchant_queue_and_operator_can_counter(client):
    shopper = start_shopper(client)
    window = client.post(
        "/api/hire/window",
        json={
            "start_date": "2026-09-14",
            "end_date": "2026-09-23",
            "rate_type": "Weekly",
            "site_location": "Mukono",
            "include_haulage": True,
        },
        headers=shopper,
    )
    assert window.status_code == 200
    added = client.post("/api/cart/add", json={"product_id": "AE-EXC-101", "quantity": 1}, headers=shopper)
    assert added.status_code == 200
    requested = client.post("/api/hire/request", json={}, headers=shopper)
    assert requested.status_code == 200
    body = requested.json()
    assert body["charged"] is False
    hire_id = body["hire"]["hire_id"]
    operator = start_operator(client)
    queue = client.get("/api/merchant/haulage", headers=operator).json()["queue"]
    assert any(row["hire_id"] == hire_id for row in queue)
    counter = client.post(
        f"/api/merchant/haulage/{hire_id}/counter",
        json={"quote": 260000},
        headers=operator,
    )
    assert counter.status_code == 200
    assert counter.json()["quote"] == 260000
