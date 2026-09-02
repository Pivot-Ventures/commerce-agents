# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""An env-gated HTTP adapter toward a live EquipAccess Laravel API.

Set ``EQUIPACCESS_API_BASE`` (and optionally ``EQUIPACCESS_API_TOKEN``) to point at
a running Laravel app. The demo defaults to fixtures — this module is not imported
unless that base is set. Nothing here places an order or takes payment.

Laravel route → StorefrontBackend method (as documented on the private app):

| Laravel | Method |
|---|---|
| GET equipments, GET scoped-products | ``search_products`` (rentals; hire is the default intent) |
| GET spare-parts | ``search_products`` when the query is a parts/buy intent |
| resource products | ``get_product_details`` |
| resource cart | ``get_cart``, ``add_to_cart``, ``update_cart_item``, ``remove_from_cart`` |
| GET rentals/rate | period quote inside search/cart (daily / weekly / monthly) |
| POST haulage, GET shipping/options | ``get_fulfillment_options`` |
| resource orders | ``get_orders``, ``get_order`` |
| customer login | host session; the token stays on this adapter |
| POST make-order-payment | not called; ``checkout_handoff`` returns a host URL |

Search must not assume live Algolia (the Scout trait was commented out). Cart quantity
must not exceed ``Product.stock``. Orders that include distance stay in Haulage Review.
"""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import urljoin

import httpx

from shopping_agent import (
    Cart,
    CheckoutHandoff,
    FulfillmentOption,
    Order,
    Policy,
    Product,
    ProductDetails,
    SearchFilters,
    ShoppingSessionContext,
    StorefrontBackend,
    UserPreferences,
)

from .mock_equipaccess import CHECKOUT_HANDOFF_URL


class EquipAccessHttpBackend(StorefrontBackend):
    """Thin client for a future Laravel base. Writes that would charge stay unimplemented."""

    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        *,
        timeout_s: float = 15.0,
    ) -> None:
        self.base_url = (base_url or os.environ.get("EQUIPACCESS_API_BASE") or "").rstrip("/")
        self.token = token or os.environ.get("EQUIPACCESS_API_TOKEN")
        self.store_name = "ACME Equip"
        self.products: dict[str, ProductDetails] = {}
        self._timeout = timeout_s

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = urljoin(f"{self.base_url}/", path.lstrip("/"))
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, params=params, headers=self._headers())
            response.raise_for_status()
            return response.json()

    def product(self, product_id: str) -> ProductDetails | None:
        return self.products.get(product_id)

    def reset_session(self, session_id: str) -> None:
        del session_id

    def recent_orders(self, limit: int = 6) -> list[Order]:
        del limit
        return []

    async def search_products(
        self,
        session: ShoppingSessionContext,
        query: str,
        filters: SearchFilters | None = None,
        limit: int = 8,
    ) -> list[Product]:
        del session
        params: dict[str, Any] = {"q": query, "limit": limit}
        if filters is not None:
            if filters.category:
                params["category"] = filters.category
            params.update(filters.attributes)
        payload = await self._get("equipments", params)
        rows = payload.get("data") or payload.get("products") or payload
        products = [Product.model_validate(_product_row(row)) for row in rows][:limit]
        for product in products:
            self.products[product.product_id] = ProductDetails.model_validate(
                product.model_dump()
            )
        return products

    async def get_product_details(
        self, session: ShoppingSessionContext, product_id: str
    ) -> ProductDetails | None:
        del session
        payload = await self._get(f"products/{product_id}")
        row = payload.get("data") or payload
        product = ProductDetails.model_validate(_product_row(row))
        self.products[product.product_id] = product
        return product

    async def get_cart(self, session: ShoppingSessionContext) -> Cart:
        payload = await self._get("cart", params={"session": session.session_id})
        return Cart.model_validate(payload.get("data") or payload)

    async def add_to_cart(
        self, session: ShoppingSessionContext, product_id: str, quantity: int
    ) -> Cart:
        raise RuntimeError("live cart writes are not wired; the demo uses fixtures")

    async def update_cart_item(
        self, session: ShoppingSessionContext, product_id: str, quantity: int
    ) -> Cart:
        raise RuntimeError("live cart writes are not wired; the demo uses fixtures")

    async def remove_from_cart(self, session: ShoppingSessionContext, product_id: str) -> Cart:
        raise RuntimeError("live cart writes are not wired; the demo uses fixtures")

    async def get_preferences(self, session: ShoppingSessionContext) -> UserPreferences:
        return UserPreferences(user_id=session.user_id, display_name="Guest")

    async def checkout_handoff(
        self, session: ShoppingSessionContext, cart: Cart
    ) -> list[CheckoutHandoff]:
        del session, cart
        # POST make-order-payment is intentionally not called.
        return [CheckoutHandoff(url=CHECKOUT_HANDOFF_URL, label="Request this hire")]

    async def get_orders(self, session: ShoppingSessionContext, limit: int = 5) -> list[Order]:
        payload = await self._get("orders", params={"limit": limit})
        rows = payload.get("data") or payload.get("orders") or []
        return [Order.model_validate(row) for row in rows][:limit]

    async def get_order(self, session: ShoppingSessionContext, order_id: str) -> Order | None:
        del session
        payload = await self._get(f"orders/{order_id}")
        row = payload.get("data") or payload
        return Order.model_validate(row) if row else None

    async def search_policies(self, session: ShoppingSessionContext, query: str) -> list[Policy]:
        del session, query
        return []

    async def get_fulfillment_options(
        self, session: ShoppingSessionContext, product_ids: list[str]
    ) -> list[FulfillmentOption]:
        del session
        payload = await self._get("shipping/options", params={"products": ",".join(product_ids)})
        rows = payload.get("data") or payload.get("options") or []
        return [FulfillmentOption.model_validate(row) for row in rows]


def _product_row(row: dict[str, Any]) -> dict[str, Any]:
    """Accept either this repo's product shape or a Laravel Product resource."""
    if "product_id" in row:
        return row
    listing = row.get("listing_type") or "Rent"
    return {
        "product_id": str(row.get("id") or row.get("uuid")),
        "title": row.get("name") or row.get("title") or "Listing",
        "brand": row.get("brand") or row.get("store"),
        "price": float(row.get("price") or 0),
        "currency": row.get("currency") or "UGX",
        "category": row.get("category") or row.get("type"),
        "in_stock": int(row.get("stock") or 0) > 0,
        "short_description": row.get("description"),
        "attributes": {
            "listing_type": str(listing),
            "rate_type": str(row.get("rate_type") or "Daily"),
            "location": str(row.get("location") or ""),
            "stock": str(row.get("stock") or 0),
            "min_quantity": str(row.get("min_quantity") or 1),
        },
    }


def build_storefront():
    """Fixtures unless ``EQUIPACCESS_API_BASE`` is set."""
    from .mock_equipaccess import MockEquipAccess

    base = os.environ.get("EQUIPACCESS_API_BASE")
    if base:
        return EquipAccessHttpBackend(base)
    return MockEquipAccess()
