# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

from datetime import date

from equipaccess.api.mock_equipaccess import HireWindow, MockEquipAccess
from equipaccess.api.rates import RATE_WEEKLY, haulage_fee, haulage_km, quote_hire
from shopping_agent import SearchFilters, Unavailable


async def test_hire_search_quotes_dates_and_location(backend, session):
    results = await backend.search_products(
        session,
        "20-ton excavator in Mukono for 10 days",
        SearchFilters(
            attributes={
                "start_date": "2026-09-14",
                "end_date": "2026-09-23",
                "location": "Mukono",
                "machine_class": "excavator",
                "include_haulage": "yes",
                "site_location": "Mukono",
            }
        ),
    )
    assert results
    hero = next(item for item in results if item.product_id == "AE-EXC-101")
    assert hero.attributes["hire_start"] == "2026-09-14"
    assert hero.attributes["number_of_days"] == "10"
    assert hero.price == 14_400_000
    assert hero.attributes["rate_type"] == RATE_WEEKLY
    assert int(hero.attributes["units_left_for_dates"]) == 2
    assert all(item.attributes.get("listing_type") != "Sale" for item in results)


async def test_sale_and_parts_stay_out_of_hire_search(backend, session):
    hire = await backend.search_products(session, "excavator Mukono")
    ids = {item.product_id for item in hire}
    assert "AE-SAL-110" not in ids
    assert "AE-PRT-010" not in ids
    parts = await backend.search_products(session, "spare hydraulic hose kit")
    assert parts and parts[0].product_id == "AE-PRT-010"
    sale = await backend.search_products(session, "buy used generator")
    assert any(item.product_id == "AE-SAL-360" for item in sale)
    materials = await backend.search_products(session, "cement bags for the site")
    assert materials and materials[0].product_id == "AE-MAT-010"
    hire_ids = {
        item.product_id for item in await backend.search_products(session, "excavator Mukono")
    }
    assert "AE-MAT-010" not in hire_ids
    assert "AE-WEB-HIR-101" not in hire_ids
    assert all(item.attributes.get("source", "yard") == "yard" for item in hire)


async def test_on_hire_dump_truck_is_unavailable_and_substitute_ranks(backend, session):
    results = await backend.search_products(
        session,
        "dump truck Entebbe",
        SearchFilters(
            attributes={
                "start_date": "2026-09-14",
                "end_date": "2026-09-20",
                "machine_class": "dump truck",
            }
        ),
        limit=8,
    )
    booked = next(item for item in results if item.product_id == "AE-DMP-301")
    assert booked.in_stock is False
    assert "On hire" in booked.labels
    assert any(item.product_id == "AE-DMP-302" and item.in_stock for item in results)


async def test_date_overlap_holds_stock(backend, session, other_session):
    window = HireWindow(
        start=date(2026, 9, 14),
        end=date(2026, 9, 23),
        rate_type=RATE_WEEKLY,
        site_location="Mukono",
        include_haulage=True,
    )
    backend.note_hire_window(session.session_id, window)
    cart = await backend.add_to_cart(session, "AE-EXC-101", 2)
    assert cart.items[0].quantity == 2
    assert backend.units_left_on("AE-EXC-101", window.start, window.end) == 0
    backend.note_hire_window(other_session.session_id, window)
    try:
        await backend.add_to_cart(other_session, "AE-EXC-101", 1)
        raise AssertionError("overlap should refuse the second hold")
    except Unavailable:
        pass


async def test_haulage_quotes_before_a_cart_line(backend, session):
    backend.note_hire_window(
        session.session_id,
        HireWindow(
            start=date(2026, 9, 14),
            end=date(2026, 9, 23),
            rate_type=RATE_WEEKLY,
            site_location="Mukono",
            include_haulage=True,
        ),
    )
    extras = backend.cart_extras(session.session_id)
    assert extras["haulage"]["fee"] == 240_000
    assert extras["deposit"] == 240_000


async def test_haulage_toggle_can_turn_off(backend, session):
    backend.note_hire_window(
        session.session_id,
        HireWindow(
            start=date(2026, 9, 12),
            end=date(2026, 9, 21),
            rate_type=RATE_WEEKLY,
            site_location="Ntinda",
            include_haulage=False,
        ),
    )
    extras = backend.cart_extras(session.session_id)
    assert extras["haulage"] is None
    assert extras["deposit"] == 0


async def test_cart_line_is_the_period_quote(backend, session):
    backend.note_hire_window(
        session.session_id,
        HireWindow(
            start=date(2026, 9, 14),
            end=date(2026, 9, 23),
            rate_type=RATE_WEEKLY,
            site_location="Mukono",
            include_haulage=True,
        ),
    )
    cart = await backend.add_to_cart(session, "AE-EXC-101", 1)
    line = cart.items[0]
    assert line.line_total == 14_400_000
    assert line.option_values["rate_type"] == RATE_WEEKLY
    assert line.option_values["type"] == "Rent"
    extras = backend.cart_extras(session.session_id)
    assert extras["haulage"]["fee"] == 240_000
    assert extras["haulage"]["round_trip_fee"] == 480_000
    assert extras["haulage"]["label"] == "Needs haulage review"
    assert extras["deposit"] == 240_000


async def test_request_hire_does_not_charge_and_lands_in_haulage_review(backend, session):
    backend.note_hire_window(
        session.session_id,
        HireWindow(
            start=date(2026, 9, 14),
            end=date(2026, 9, 23),
            rate_type=RATE_WEEKLY,
            site_location="Mukono",
            include_haulage=True,
        ),
    )
    await backend.add_to_cart(session, "AE-EXC-101", 1)
    hire = backend.request_hire(session)
    assert hire.status == "haulage_review"
    assert hire.haulage_fee == 240_000
    assert hire.subtotal == 14_400_000
    queue = backend.haulage_queue()
    assert any(row["hire_id"] == hire.hire_id for row in queue)
    approved = backend.approve_haulage(hire.hire_id)
    assert approved.status == "haulage_approved"
    assert (
        "not" in approved.note.lower()
        or "uncharged" in approved.note.lower()
        or "checkout" in approved.note.lower()
    )


async def test_checkout_handoff_never_charges(backend, session):
    cart = await backend.add_to_cart(session, "AE-PRT-010", 1)
    handoffs = await backend.checkout_handoff(session, cart)
    assert handoffs and "checkout" in handoffs[0].url
    assert handoffs[0].label == "Request this hire"


def test_weekly_quote_math():
    product = MockEquipAccess().products["AE-EXC-101"]
    quote = quote_hire(product, 10, RATE_WEEKLY)
    assert quote["quoted_total"] == 14_400_000
    assert quote["periods"] == 2
    assert haulage_fee(18) == 240_000


def test_default_ntinda_haulage_covers_catalog_yards():
    assert haulage_km("Jinja", "Ntinda") == 82
    assert haulage_km("Gulu", "Ntinda") == 334
    assert haulage_fee(haulage_km("Jinja", "Ntinda")) == haulage_fee(82)
    assert haulage_fee(haulage_km("Gulu", "Ntinda")) == haulage_fee(334)


async def test_haulage_follows_picked_yard_not_leftover_cart(backend, session):
    backend.note_hire_window(
        session.session_id,
        HireWindow(
            start=date(2026, 9, 12),
            end=date(2026, 9, 21),
            rate_type=RATE_WEEKLY,
            site_location="Ntinda",
            yard_location="Mukono",
            include_haulage=True,
        ),
    )
    await backend.add_to_cart(session, "AE-EXC-101", 1)
    leftover = backend.cart_extras(session.session_id)
    assert leftover["haulage"]["from"] == "Mukono"
    backend.note_hire_window(
        session.session_id,
        HireWindow(
            start=date(2026, 9, 12),
            end=date(2026, 9, 21),
            rate_type=RATE_WEEKLY,
            site_location="Ntinda",
            yard_location="Jinja",
            include_haulage=True,
        ),
    )
    extras = backend.cart_extras(session.session_id)
    assert extras["haulage"]["from"] == "Jinja"
    assert extras["haulage"]["to"] == "Ntinda"
    assert extras["haulage"]["distance_km"] == 82
    assert extras["haulage"]["fee"] == haulage_fee(82)


async def test_web_find_cannot_join_hire_cart(backend, session):
    try:
        await backend.add_to_cart(session, "AE-WEB-HIR-101", 1)
        raise AssertionError("web finds must not join the hire cart")
    except Unavailable as error:
        assert "web find" in str(error).lower()
    cart = await backend.get_cart(session)
    assert cart.items == []


async def test_materials_delivery_reaches_cart_extras(backend, session):
    backend.note_hire_window(
        session.session_id,
        HireWindow(
            start=date(2026, 9, 12),
            end=date(2026, 9, 21),
            site_location="Ntinda",
            include_delivery=True,
        ),
    )
    cart = await backend.add_to_cart(session, "AE-MAT-011", 1)
    extras = backend.cart_extras(session.session_id)
    assert extras["delivery"]["to"] == "Ntinda"
    assert extras["delivery"]["fee"] == 180_000
    hire = backend.request_hire(session)
    assert hire.total == round(cart.subtotal + 180_000, 2)


def test_catalog_has_a_full_shop_per_section():
    products = list(MockEquipAccess().products.values())
    kinds = {}
    for product in products:
        kind = (product.attributes.get("listing_type") or "Rent").title()
        kinds[kind] = kinds.get(kind, 0) + 1
    assert kinds.get("Rent", 0) >= 10
    assert kinds.get("Sale", 0) >= 10
    assert kinds.get("Spare", 0) >= 10
    assert kinds.get("Material", 0) >= 10
    web = [
        product for product in products if (product.attributes.get("source") or "yard") != "yard"
    ]
    assert len(web) >= 8
    assert all(product.attributes.get("source_url") for product in web)
    assert all(product.image_url for product in products)
