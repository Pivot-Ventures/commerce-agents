# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The ACME Equip ``StorefrontBackend`` over the fixtures in ``data/``. Rental
listings are dated quotes: search filters carry ``start_date``, ``end_date``,
``location``, and ``machine_class``, and a result's price is the hire total for that
window at the listing's daily, weekly, or monthly rate. Adding a rental to the cart
holds those dates against stock (entertainment-style overlap, travel-style quote).
Sale listings and spare parts stay static SKUs and only surface when the query is
clearly a buy."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from demo_common.storefront_fixtures import (
    SessionCarts,
    example_data_dir,
    find_order,
    find_product,
    keyword_score,
    load_catalog,
    load_json,
    load_orders,
    load_policies,
    load_users,
    matches_attribute_filters,
    newest_orders,
    orders_for,
    preferences_of,
    rank_products,
    search_help,
    summary_of,
    unavailable_detail,
    within_price_and_rating,
)
from shopping_agent import (
    Cart,
    CartItem,
    CheckoutHandoff,
    FulfillmentOption,
    Order,
    OrderItem,
    OrderStatus,
    Policy,
    Product,
    ProductDetails,
    SearchFilters,
    ShoppingSessionContext,
    StorefrontBackend,
    Unavailable,
    UserPreferences,
)

from .rates import (
    RATE_DAILY,
    default_hire_window,
    haulage_fee,
    haulage_km,
    haulage_round_trip,
    hire_days,
    normalize_rate_type,
    parse_iso_date,
    quote_hire,
    ranges_overlap,
    recommended_rate_type,
)

DATA_DIR = example_data_dir(__file__)

# Hosted Flutterwave checkout is a handoff URL only. The model never posts payment.
CHECKOUT_HANDOFF_URL = "https://checkout.flutterwave.com/pay/acme-equip-hire"

_SEARCH_WEIGHTS = {
    "title": 3.0,
    "location": 2.5,
    "machine_class": 2.5,
    "brand": 2.0,
    "category": 2.0,
    "attributes": 1.5,
    "description": 1.0,
}
_SYNONYMS: dict[str, list[str]] = {
    "excavator": ["digger", "hoe", "twenty", "20-ton", "20t", "20ton"],
    "digger": ["excavator"],
    "loader": ["shovel", "wheel"],
    "backhoe": ["loader"],
    "dump": ["tipper", "truck", "hauler"],
    "truck": ["dump", "tipper"],
    "compactor": ["roller", "pack"],
    "roller": ["compactor"],
    "generator": ["genset", "power"],
    "scaffolding": ["scaffold", "access"],
    "crane": ["lift"],
    "mixer": ["concrete"],
    "forklift": ["fork", "yard"],
    "hose": ["hydraulic", "spare"],
    "hire": ["rent", "rental"],
    "rent": ["hire", "rental"],
    "buy": ["sale", "used"],
    "sale": ["buy", "used"],
    "spare": ["part", "parts"],
    "part": ["spare"],
    "haulage": ["transport", "delivery", "truck"],
    "transport": ["haulage", "delivery"],
}

_DATE_FILTERS = frozenset(
    {"start_date", "end_date", "hire_start", "hire_end", "travel_date", "duration_days"}
)
_QUOTE_FILTERS = _DATE_FILTERS | {
    "rate_type",
    "site_location",
    "distance_km",
    "include_haulage",
}
_SALE_HINTS = frozenset(
    {
        "buy",
        "sale",
        "sold",
        "purchase",
        "used",
        "spare",
        "part",
        "parts",
        "hose",
        "hoses",
        "teeth",
        "cement",
        "rebar",
        "timber",
        "material",
        "materials",
        "aggregate",
        "jiji",
        "lexa",
        "clone",
        "mantrac",
        "web",
    }
)
_RENT_HINTS = frozenset({"hire", "rent", "rental", "lease"})


def _stock_of(product: ProductDetails) -> int:
    raw = product.attributes.get("stock")
    if raw is None or raw == "":
        return 1 if product.in_stock else 0
    try:
        return max(0, int(raw))
    except ValueError:
        return 1 if product.in_stock else 0


def _listing_type(product: ProductDetails) -> str:
    return (product.attributes.get("listing_type") or "Rent").strip().title()


def _is_rental(product: ProductDetails) -> bool:
    return _listing_type(product) == "Rent"


def _is_yard(product: ProductDetails) -> bool:
    return (product.attributes.get("source") or "yard").strip().lower() == "yard"


def _query_wants_sale(query: str) -> bool:
    tokens = {token.strip(".,!?") for token in query.lower().split()}
    return bool(tokens & _SALE_HINTS and not (tokens & _RENT_HINTS))


@dataclass
class HireWindow:
    """The dated hire the session last searched or staged, so a bare add books those
    dates rather than a quantity of 1 at the catalog daily rate."""

    start: date
    end: date
    rate_type: str = RATE_DAILY
    site_location: str | None = None
    distance_km: float | None = None
    include_haulage: bool = False

    @property
    def days(self) -> int:
        return hire_days(self.start, self.end)


@dataclass
class DateHold:
    session_id: str
    product_id: str
    start: date
    end: date
    quantity: int


@dataclass
class HireRequest:
    """A staged hire the customer requested. Nothing is charged; haulage rows wait
    for the merchant operator."""

    hire_id: str
    user_id: str
    session_id: str
    status: str
    items: list[dict[str, Any]]
    haulage: dict[str, Any] | None
    subtotal: float
    haulage_fee: float
    deposit: float
    total: float
    currency: str
    created_at: datetime
    note: str = "No charge. Haulage review is outstanding."
    agent_id: str | None = None


class MockEquipAccess(StorefrontBackend):
    def __init__(self, data_dir: Path = DATA_DIR, today: date | None = None) -> None:
        self.today: date = today or datetime.now(UTC).date()
        catalog, self.products, self.variants = load_catalog(data_dir)
        self.store_name: str = catalog.get("store_name", "ACME Equip")
        self._users = load_users(data_dir)
        self._orders = load_orders(data_dir)
        self._policies = load_policies(data_dir)
        bookings = load_json(data_dir, "bookings.json")
        self._bookings: list[dict[str, Any]] = list(bookings.get("bookings", []))
        self._carts = SessionCarts()
        self._windows: dict[str, HireWindow] = {}
        self._holds: dict[str, list[DateHold]] = {}
        self._hires: list[HireRequest] = []
        self._hire_seq = 7800
        self._accounts = load_json(data_dir, "users.json").get("accounts", {})
        self._seed_hires(data_dir)

    # ------------------------------------------------------------------
    # Hire window and calendar
    # ------------------------------------------------------------------

    def note_hire_window(self, session_id: str, window: HireWindow) -> None:
        self._windows[session_id] = window

    def hire_window(self, session_id: str) -> HireWindow | None:
        return self._windows.get(session_id)

    def _window_from_filters(
        self, filters: SearchFilters | None, session: ShoppingSessionContext
    ) -> HireWindow | None:
        if filters is None:
            return None
        attrs = filters.attributes
        start = parse_iso_date(attrs.get("start_date") or attrs.get("hire_start"))
        end = parse_iso_date(attrs.get("end_date") or attrs.get("hire_end"))
        if start is None:
            travel = parse_iso_date(attrs.get("travel_date"))
            if travel is not None:
                start = travel
        if start is not None and end is None:
            try:
                days = int(attrs.get("duration_days") or "10")
            except ValueError:
                days = 10
            end = start + timedelta(days=max(1, days) - 1)
        if start is None or end is None:
            return None
        if end < start:
            start, end = end, start
        site = attrs.get("site_location") or attrs.get("location")
        try:
            distance = float(attrs["distance_km"]) if attrs.get("distance_km") else None
        except ValueError:
            distance = None
        haulage = attrs.get("include_haulage", "").lower() in {"1", "yes", "true"}
        window = HireWindow(
            start=start,
            end=end,
            rate_type=(
                normalize_rate_type(attrs.get("rate_type"))
                if attrs.get("rate_type")
                else recommended_rate_type(hire_days(start, end))
            ),
            site_location=site,
            distance_km=distance,
            include_haulage=haulage,
        )
        self.note_hire_window(session.session_id, window)
        return window

    def _window_for_add(
        self, session: ShoppingSessionContext, product: ProductDetails
    ) -> HireWindow:
        existing = self._windows.get(session.session_id)
        if existing is not None:
            return existing
        prefs = preferences_of(self._users, session.user_id)
        try:
            days = int(prefs.preferences.get("preferred_hire_days") or "10")
        except ValueError:
            days = 10
        start, end = default_hire_window(self.today, days)
        window = HireWindow(
            start=start,
            end=end,
            rate_type=recommended_rate_type(days),
            site_location=prefs.default_location,
        )
        self.note_hire_window(session.session_id, window)
        return window

    def _booked_on(self, product_id: str, start: date, end: date) -> int:
        taken = 0
        for row in self._bookings:
            if row.get("product_id") != product_id:
                continue
            booked_start = parse_iso_date(row.get("start_date"))
            booked_end = parse_iso_date(row.get("end_date"))
            if booked_start is None or booked_end is None:
                continue
            if ranges_overlap(start, end, booked_start, booked_end):
                taken += int(row.get("quantity") or 1)
        return taken

    def _held_on(
        self, product_id: str, start: date, end: date, *, except_session: str | None
    ) -> int:
        taken = 0
        for session_id, holds in self._holds.items():
            if except_session and session_id == except_session:
                continue
            for hold in holds:
                if hold.product_id == product_id and ranges_overlap(
                    start, end, hold.start, hold.end
                ):
                    taken += hold.quantity
        return taken

    def units_left_on(
        self,
        product_id: str,
        start: date,
        end: date,
        *,
        except_session: str | None = None,
    ) -> int:
        product = self.product(product_id)
        if product is None:
            return 0
        stock = _stock_of(product)
        return max(
            0,
            stock
            - self._booked_on(product_id, start, end)
            - self._held_on(product_id, start, end, except_session=except_session),
        )

    def _holds_for(self, session_id: str) -> list[DateHold]:
        return self._holds.setdefault(session_id, [])

    # ------------------------------------------------------------------
    # Catalog
    # ------------------------------------------------------------------

    def _searchable_text(self, product: ProductDetails) -> dict[str, str]:
        return {
            "title": product.title,
            "location": product.attributes.get("location", ""),
            "machine_class": product.attributes.get("machine_class", ""),
            "brand": product.brand or "",
            "category": product.category or "",
            "attributes": " ".join(f"{k} {v}" for k, v in product.attributes.items()),
            "description": f"{product.short_description or ''} {product.long_description or ''}",
        }

    def _score(self, product: ProductDetails, query_tokens: list[str]) -> float:
        return keyword_score(
            self._searchable_text(product), _SEARCH_WEIGHTS, query_tokens, _SYNONYMS
        )

    def _hard_filter(
        self, product: ProductDetails, filters: SearchFilters, *, sale_ok: bool
    ) -> bool:
        if not within_price_and_rating(product, filters):
            return False
        if product.attributes.get("listing_status") in {"pending", "New", "new"}:
            return False
        if str(product.attributes.get("published") or "true").lower() in {"false", "0", "no"}:
            return False
        if not sale_ok:
            return _is_rental(product) and _is_yard(product)
        return True

    def _soft_filter(self, product: ProductDetails, filters: SearchFilters) -> bool:
        return matches_attribute_filters(product, filters, ignore=frozenset(_QUOTE_FILTERS))

    def _quote_product(self, product: Product, window: HireWindow) -> None:
        detail = self.product(product.product_id)
        if detail is None or not _is_rental(detail):
            return
        quote = quote_hire(detail, window.days, window.rate_type)
        product.price = quote["quoted_total"]
        product.attributes = {
            **product.attributes,
            "hire_start": window.start.isoformat(),
            "hire_end": window.end.isoformat(),
            "number_of_days": str(window.days),
            "rate_type": quote["rate_type"],
            "quoted_total": str(int(quote["quoted_total"])),
            "recommended_rate_type": recommended_rate_type(window.days),
        }
        left = self.units_left_on(product.product_id, window.start, window.end)
        product.attributes["units_left_for_dates"] = str(left)
        product.in_stock = left > 0
        if left <= 0:
            product.labels = [label for label in product.labels if label != "In stock"]
            if "On hire" not in product.labels:
                product.labels = [*product.labels, "On hire"]

    async def search_products(
        self,
        session: ShoppingSessionContext,
        query: str,
        filters: SearchFilters | None = None,
        limit: int = 8,
    ) -> list[Product]:
        sale_ok = _query_wants_sale(query)
        filters = filters or SearchFilters()
        window = self._window_from_filters(filters, session)
        ranked = rank_products(
            self.products.values(),
            query,
            filters,
            limit,
            score=self._score,
            hard_filter=lambda product, chosen: self._hard_filter(product, chosen, sale_ok=sale_ok),
            soft_filter=self._soft_filter,
        )
        results = [summary_of(product) for product in ranked]
        if window is not None:
            for product in results:
                self._quote_product(product, window)
        return results

    def product(self, product_id: str) -> ProductDetails | None:
        return find_product(self.products, self.variants, product_id)

    async def get_product_details(
        self, session: ShoppingSessionContext, product_id: str
    ) -> ProductDetails | None:
        product = self.product(product_id)
        if product is None:
            return None
        window = self._windows.get(session.session_id)
        if window is None or not _is_rental(product):
            return product
        quoted = product.model_copy(deep=True)
        summary = summary_of(quoted)
        self._quote_product(summary, window)
        quoted.price = summary.price
        quoted.attributes = summary.attributes
        quoted.in_stock = summary.in_stock
        quoted.labels = summary.labels
        return quoted

    # ------------------------------------------------------------------
    # Cart
    # ------------------------------------------------------------------

    def _line_for(
        self, product: ProductDetails, quantity: int, window: HireWindow | None
    ) -> CartItem:
        if window is None or not _is_rental(product):
            return CartItem(
                product_id=product.product_id,
                title=product.title,
                price=product.price,
                quantity=quantity,
                image_url=product.image_url,
                option_values=product.option_values,
                variant_of=product.variant_of,
            )
        quote = quote_hire(product, window.days, window.rate_type)
        return CartItem(
            product_id=product.product_id,
            title=product.title,
            price=quote["quoted_total"],
            quantity=quantity,
            image_url=product.image_url,
            option_values={
                **product.option_values,
                "type": _listing_type(product),
                "start_date": window.start.isoformat(),
                "end_date": window.end.isoformat(),
                "number_of_days": str(window.days),
                "rate_type": quote["rate_type"],
            },
            variant_of=product.variant_of,
        )

    def _replace_hold(
        self, session_id: str, product_id: str, window: HireWindow, quantity: int
    ) -> None:
        holds = [hold for hold in self._holds_for(session_id) if hold.product_id != product_id]
        if quantity > 0:
            holds.append(
                DateHold(
                    session_id=session_id,
                    product_id=product_id,
                    start=window.start,
                    end=window.end,
                    quantity=quantity,
                )
            )
        self._holds[session_id] = holds

    async def get_cart(self, session: ShoppingSessionContext) -> Cart:
        cart = self._carts.cart(session.session_id)
        extras = self.cart_extras(session.session_id)
        return cart.model_copy() if extras else cart

    def cart_extras(self, session_id: str) -> dict[str, Any]:
        window = self._windows.get(session_id)
        cart = self._carts.cart(session_id)
        haulage = None
        if window is not None and window.include_haulage:
            yard = None
            for item in cart.items:
                product = self.product(item.product_id)
                if product and _is_rental(product):
                    yard = product.attributes.get("location")
                    break
            if yard is None:
                yard = window.site_location
            kilometres = haulage_km(yard, window.site_location, window.distance_km)
            fee = haulage_fee(kilometres)
            if fee is not None:
                haulage = {
                    "from": yard,
                    "to": window.site_location,
                    "distance_km": kilometres,
                    "fee": fee,
                    "round_trip_fee": haulage_round_trip(fee),
                    "status": "needs_review",
                    "label": "Needs haulage review",
                }
        deposit = float(haulage["fee"]) if haulage else 0.0
        return {
            "hire_window": {
                "start": window.start.isoformat(),
                "end": window.end.isoformat(),
                "days": window.days,
                "rate_type": window.rate_type,
                "site_location": window.site_location,
                "include_haulage": window.include_haulage,
            }
            if window
            else None,
            "haulage": haulage,
            "deposit": deposit,
            "currency": "UGX",
        }

    async def add_to_cart(
        self, session: ShoppingSessionContext, product_id: str, quantity: int
    ) -> Cart:
        product = self.product(product_id)
        if product is None:
            raise Unavailable(f"{product_id} is not in the catalog")
        existing = self._carts.lines(session.session_id).get(product_id)
        quantity += existing.quantity if existing else 0
        if _is_rental(product):
            window = self._window_for_add(session, product)
            left = self.units_left_on(
                product.product_id, window.start, window.end, except_session=session.session_id
            )
            if quantity > left:
                raise Unavailable(unavailable_detail(product, None))
            if quantity > _stock_of(product):
                raise Unavailable(unavailable_detail(product, None))
            self._carts.lines(session.session_id)[product.product_id] = self._line_for(
                product, quantity, window
            )
            self._replace_hold(session.session_id, product.product_id, window, quantity)
            return self._carts.cart(session.session_id)
        if quantity > _stock_of(product) or not product.in_stock:
            raise Unavailable(unavailable_detail(product, None))
        return self._carts.put(session.session_id, product, quantity)

    async def update_cart_item(
        self, session: ShoppingSessionContext, product_id: str, quantity: int
    ) -> Cart:
        product = self.product(product_id)
        if product is None or product_id not in self._carts.lines(session.session_id):
            return self._carts.cart(session.session_id)
        if _is_rental(product):
            window = self._window_for_add(session, product)
            left = self.units_left_on(
                product.product_id, window.start, window.end, except_session=session.session_id
            )
            if quantity > left or quantity > _stock_of(product):
                raise Unavailable(unavailable_detail(product, None))
            self._carts.lines(session.session_id)[product.product_id] = self._line_for(
                product, quantity, window
            )
            self._replace_hold(session.session_id, product.product_id, window, quantity)
            return self._carts.cart(session.session_id)
        return self._carts.set_quantity(session.session_id, product_id, quantity)

    async def remove_from_cart(self, session: ShoppingSessionContext, product_id: str) -> Cart:
        cart = self._carts.remove(session.session_id, product_id)
        self._holds[session.session_id] = [
            hold for hold in self._holds_for(session.session_id) if hold.product_id != product_id
        ]
        return cart

    def reset_session(self, session_id: str) -> None:
        self._carts.reset(session_id)
        self._windows.pop(session_id, None)
        self._holds.pop(session_id, None)

    # ------------------------------------------------------------------
    # Customer, hires, help, fulfillment
    # ------------------------------------------------------------------

    async def get_preferences(self, session: ShoppingSessionContext) -> UserPreferences:
        return preferences_of(self._users, session.user_id)

    async def get_account_context(self, session: ShoppingSessionContext) -> dict[str, Any] | None:
        account = self._accounts.get(session.user_id)
        if not account:
            return None
        prefs = preferences_of(self._users, session.user_id)
        return {
            "role": account.get("role", "customer"),
            "signed_in": True,
            "site_location": prefs.default_location,
            "typical_machine_class": prefs.preferences.get("typical_machine_class"),
            "preferred_hire_days": prefs.preferences.get("preferred_hire_days"),
            "company": account.get("company"),
        }

    async def checkout_handoff(
        self, session: ShoppingSessionContext, cart: Cart
    ) -> list[CheckoutHandoff]:
        del session, cart
        return [
            CheckoutHandoff(
                url=CHECKOUT_HANDOFF_URL,
                label="Request this hire",
            )
        ]

    async def get_orders(self, session: ShoppingSessionContext, limit: int = 5) -> list[Order]:
        live = [hire for hire in self._hires if hire.user_id == session.user_id]
        orders = orders_for(self._orders, session.user_id, limit)
        extra = [self._order_from_hire(hire) for hire in live]
        merged = extra + orders
        merged.sort(key=lambda order: order.placed_at, reverse=True)
        return merged[:limit]

    async def get_order(self, session: ShoppingSessionContext, order_id: str) -> Order | None:
        for hire in self._hires:
            if hire.user_id == session.user_id and hire.hire_id.lower() == order_id.lower():
                return self._order_from_hire(hire)
        return find_order(self._orders, session.user_id, order_id)

    def recent_orders(self, limit: int = 6) -> list[Order]:
        live = [self._order_from_hire(hire) for hire in self._hires]
        return sorted(
            live + newest_orders(self._orders, limit),
            key=lambda order: order.placed_at,
            reverse=True,
        )[:limit]

    def _order_from_hire(self, hire: HireRequest) -> Order:
        return Order(
            order_id=hire.hire_id,
            status=OrderStatus.PROCESSING,
            placed_at=hire.created_at,
            items=[
                OrderItem(
                    product_id=item["product_id"],
                    title=item["title"],
                    quantity=item["quantity"],
                    price=item["price"],
                )
                for item in hire.items
            ],
            total=hire.total,
            currency=hire.currency,
            estimated_delivery="Haulage Review — a person confirms transport, then you pay",
        )

    async def search_policies(self, session: ShoppingSessionContext, query: str) -> list[Policy]:
        del session
        return search_help(self._policies, query)

    async def get_fulfillment_options(
        self, session: ShoppingSessionContext, product_ids: list[str]
    ) -> list[FulfillmentOption]:
        rentals = [
            self.products[pid]
            for pid in product_ids
            if pid in self.products and _is_rental(self.products[pid])
        ]
        options = [
            FulfillmentOption(
                method="pickup",
                eta="collect at the yard on the hire start date; operator optional",
                fee=0.0,
                location=rentals[0].attributes.get("location") if rentals else "yard",
            )
        ]
        if not rentals:
            options.append(
                FulfillmentOption(
                    method="shipping",
                    eta="spare parts dispatch from Kampala in 1-3 days",
                    fee=25000.0,
                )
            )
            return options
        window = self._windows.get(session.session_id)
        site = window.site_location if window else None
        yard = rentals[0].attributes.get("location")
        kilometres = haulage_km(yard, site, window.distance_km if window else None)
        fee = haulage_fee(kilometres)
        if fee is None:
            options.append(
                FulfillmentOption(
                    method="delivery",
                    eta=(
                        "haulage to site is priced by distance once a site location is set; "
                        "orders with haulage go to Haulage Review and are not charged here"
                    ),
                    fee=0.0,
                )
            )
        else:
            options.append(
                FulfillmentOption(
                    method="delivery",
                    eta=(
                        f"haulage {yard} to {site}, {kilometres:.0f} km; "
                        "quote needs haulage review — nothing is charged in this conversation"
                    ),
                    fee=fee,
                    location=site,
                )
            )
        return options

    # ------------------------------------------------------------------
    # Host hire request (no payment)
    # ------------------------------------------------------------------

    def request_hire(self, session: ShoppingSessionContext) -> HireRequest:
        cart = self._carts.cart(session.session_id)
        if not cart.items:
            raise Unavailable("cart is empty")
        extras = self.cart_extras(session.session_id)
        haulage = extras.get("haulage")
        haulage_amount = float(haulage["fee"]) if haulage else 0.0
        deposit = float(extras.get("deposit") or 0)
        self._hire_seq += 1
        hire = HireRequest(
            hire_id=f"HIRE-{self._hire_seq}",
            user_id=session.user_id,
            session_id=session.session_id,
            status="haulage_review" if haulage else "requested",
            items=[
                {
                    "product_id": item.product_id,
                    "title": item.title,
                    "quantity": item.quantity,
                    "price": item.price,
                    "option_values": item.option_values,
                }
                for item in cart.items
            ],
            haulage=haulage,
            subtotal=cart.subtotal,
            haulage_fee=haulage_amount,
            deposit=deposit,
            total=round(cart.subtotal + haulage_amount + deposit, 2),
            currency="UGX",
            created_at=datetime.now(UTC),
        )
        self._hires.append(hire)
        # Convert the session hold into a booking so the calendar and later searches
        # see the units as on hire, then clear the cart.
        window = self._windows.get(session.session_id)
        if window is not None:
            for item in cart.items:
                product = self.products.get(item.product_id)
                if product is not None and _is_rental(product):
                    self._bookings.append(
                        {
                            "product_id": item.product_id,
                            "start_date": window.start.isoformat(),
                            "end_date": window.end.isoformat(),
                            "quantity": item.quantity,
                            "hire_id": hire.hire_id,
                        }
                    )
        self._carts.reset(session.session_id)
        self._holds.pop(session.session_id, None)
        return hire

    def haulage_queue(self) -> list[dict[str, Any]]:
        rows = []
        for hire in reversed(self._hires):
            if hire.status not in {"haulage_review", "countered"}:
                continue
            first = hire.items[0] if hire.items else {}
            rows.append(
                {
                    "hire_id": hire.hire_id,
                    "created_at": hire.created_at.isoformat(),
                    "product_id": first.get("product_id"),
                    "title": first.get("title"),
                    "quantity": first.get("quantity"),
                    "site": (hire.haulage or {}).get("to"),
                    "site_city": (hire.haulage or {}).get("city"),
                    "via": (hire.haulage or {}).get("via"),
                    "from_yard": (hire.haulage or {}).get("from"),
                    "distance_km": (hire.haulage or {}).get("distance_km"),
                    "quote": hire.haulage_fee,
                    "status": hire.status,
                    "subtotal": hire.subtotal,
                    "deposit": hire.deposit,
                    "total": hire.total,
                    "currency": hire.currency,
                    "user_id": hire.user_id,
                    "agent_id": hire.agent_id,
                }
            )
        rows.sort(key=lambda row: row["created_at"], reverse=True)
        return rows

    def attach_agent(self, hire_id: str, agent_id: str) -> HireRequest:
        hire = self._hire_by_id(hire_id)
        hire.agent_id = agent_id
        return hire

    def close_delivery(self, hire_id: str, agent_id: str) -> HireRequest:
        hire = self._hire_by_id(hire_id)
        if hire.agent_id != agent_id:
            raise Unavailable(f"{hire_id} is not assigned to this agent")
        hire.status = "delivered"
        hire.note = "Delivery closed. Payment still happens on the host checkout, not here."
        return hire

    def assigned_hires(self, agent_id: str | None = None) -> list[dict[str, Any]]:
        rows = []
        for hire in reversed(self._hires):
            if hire.agent_id is None:
                continue
            if agent_id and hire.agent_id != agent_id:
                continue
            first = hire.items[0] if hire.items else {}
            rows.append(
                {
                    "hire_id": hire.hire_id,
                    "agent_id": hire.agent_id,
                    "status": hire.status,
                    "title": first.get("title"),
                    "site": (hire.haulage or {}).get("to"),
                    "shipping_amount": hire.haulage_fee,
                    "currency": hire.currency,
                }
            )
        return rows

    def approve_haulage(self, hire_id: str, quote: float | None = None) -> HireRequest:
        hire = self._hire_by_id(hire_id)
        if quote is not None:
            hire.haulage_fee = float(quote)
            if hire.haulage is not None:
                hire.haulage["fee"] = hire.haulage_fee
            hire.total = round(hire.subtotal + hire.haulage_fee + hire.deposit, 2)
        hire.status = "haulage_approved"
        hire.note = "Haulage approved. Payment still happens on the host checkout, not here."
        return hire

    def counter_haulage(self, hire_id: str, quote: float) -> HireRequest:
        hire = self._hire_by_id(hire_id)
        hire.haulage_fee = float(quote)
        if hire.haulage is not None:
            hire.haulage["fee"] = hire.haulage_fee
            hire.haulage["status"] = "countered"
        hire.total = round(hire.subtotal + hire.haulage_fee + hire.deposit, 2)
        hire.status = "countered"
        hire.note = f"Operator countered haulage at {int(quote)} UGX. Still uncharged."
        return hire

    def _seed_hires(self, data_dir: Path) -> None:
        path = data_dir / "hires.json"
        if not path.exists():
            return
        for row in load_json(data_dir, "hires.json").get("hires", []):
            created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
            hire = HireRequest(
                hire_id=row["hire_id"],
                user_id=row["user_id"],
                session_id=row.get("session_id", ""),
                status=row.get("status", "haulage_review"),
                items=list(row.get("items") or []),
                haulage=row.get("haulage"),
                subtotal=float(row.get("subtotal") or 0),
                haulage_fee=float(row.get("haulage_fee") or 0),
                deposit=float(row.get("deposit") or 0),
                total=float(row.get("total") or 0),
                currency=row.get("currency", "UGX"),
                created_at=created,
                note=row.get("note", "No charge. Haulage review is outstanding."),
                agent_id=row.get("agent_id"),
            )
            self._hires.append(hire)
            digits = "".join(ch for ch in hire.hire_id if ch.isdigit())
            if digits:
                self._hire_seq = max(self._hire_seq, int(digits))

    def _hire_by_id(self, hire_id: str) -> HireRequest:
        wanted = hire_id.lower()
        for hire in self._hires:
            if hire.hire_id.lower() == wanted:
                return hire
        raise Unavailable(f"{hire_id} is not in the haulage queue")
