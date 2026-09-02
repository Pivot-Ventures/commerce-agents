# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The ACME Equip ``MerchantBackend``: hire-yard fixtures over the same
``MockEquipAccess`` the storefront serves. A price update moves the daily rate (the
catalog price); a promotion is a date-window rate move recorded as an override.
Haulage approve/counter is a host action on the storefront's hire queue, not a
ledger write."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from typing import Any

from demo_common.merchant_fixtures import (
    alert_counts,
    apply_campaign_item,
    filter_listings,
    is_browse,
    load_campaigns,
    load_issues,
    margin_pct,
    metric_window,
    named_ids,
    rebase_daily,
    snapshot_of,
    stage_campaign,
    staged_promotion_windows,
)
from demo_common.storefront_fixtures import find_by_id, load_json
from merchant_agent import (
    ActorKind,
    AlertCounts,
    BusinessSnapshot,
    Campaign,
    CampaignDraft,
    ChangeItem,
    ChangeKind,
    ChangeLedger,
    InventoryActionItem,
    InventoryAlert,
    Listing,
    ListingDetails,
    ListingFilters,
    MerchantAgentConfig,
    MerchantBackend,
    MerchantSessionContext,
    MetricPoint,
    MetricSeries,
    OrderIssue,
    PriceUpdateItem,
    PricingContext,
    PromotionDraft,
    StagedChange,
)
from shopping_agent import SearchFilters, ShoppingSessionContext

from .mock_equipaccess import DATA_DIR, MockEquipAccess

_MONEY_METRICS = {"sales", "revenue", "average_order_value", "aov", "daily_rate"}


class MockEquipMerchant(MerchantBackend):
    def __init__(
        self,
        storefront: MockEquipAccess,
        config: MerchantAgentConfig | None = None,
        data_dir: Path = DATA_DIR,
    ) -> None:
        self.storefront = storefront
        self.config = config or MerchantAgentConfig(brand_name=storefront.store_name)
        self.ledger = ChangeLedger(self.config)
        metrics = load_json(data_dir, "merchant_metrics.json")
        self._daily = rebase_daily(metrics["daily"])
        self._currency: str = metrics.get("currency", "UGX")
        calendar = load_json(data_dir, "merchant_calendar.json")
        self._calendar_window: dict[str, str] = calendar.get("window", {})
        self._calendar: dict[str, dict[str, Any]] = {
            row["listing_id"]: dict(row) for row in calendar.get("listings", [])
        }
        inventory = load_json(data_dir, "merchant_inventory.json")
        self._inventory: dict[str, dict[str, Any]] = {
            row["product_id"]: dict(row) for row in inventory.get("inventory", [])
        }
        self._campaigns = load_campaigns(data_dir)
        self._issues = load_issues(data_dir)
        self._listing_state: dict[str, dict[str, Any]] = {}
        self.rate_overrides: dict[str, list[dict[str, Any]]] = {}
        self._promotion_windows: dict[str, dict[str, Any]] = {}
        self.yard_name = calendar.get("yard", "ACME Plant Hire — Mukono")

    def _state_row(self, product_id: str) -> dict[str, Any]:
        if product_id not in self._listing_state:
            stock_row = self._inventory.get(product_id, {})
            self._listing_state[product_id] = {
                "product_id": product_id,
                "stock": int(stock_row.get("stock", 1)),
                "threshold": int(stock_row.get("threshold", 1)),
                "hires_last_30d": int(stock_row.get("hires_last_30d", 4)),
                "status": "active",
                "content_quality": stock_row.get("content_quality", "good"),
            }
        return self._listing_state[product_id]

    def _listing(self, product_id: str) -> Listing | None:
        product = self.storefront.products.get(product_id)
        if product is None:
            return None
        row = self._state_row(product_id)
        status = row.get("status", "active")
        if status == "active" and not product.in_stock:
            status = "out_of_stock"
        return Listing(
            listing_id=product.product_id,
            title=product.title,
            status=status,
            price=product.price,
            currency=product.currency,
            stock=int(row.get("stock", 1)),
            category=product.category,
            content_quality=row.get("content_quality", "good"),
            attributes=product.attributes,
            image_url=product.image_url,
            short_description=product.short_description,
        )

    def all_listings(self) -> list[Listing]:
        listings = [
            listing
            for product_id in self.storefront.products
            if (listing := self._listing(product_id)) is not None
        ]
        listings.sort(key=lambda listing: (listing.category or "", listing.listing_id))
        return listings

    def _alert_counts(self) -> AlertCounts:
        return alert_counts(self._compute_alerts(), self._issues, self.ledger)

    async def get_business_snapshot(
        self, session: MerchantSessionContext, period: str | None = None
    ) -> BusinessSnapshot:
        del session
        return snapshot_of(
            self._daily, period, currency=self._currency, alerts=self._alert_counts()
        )

    async def query_metrics(
        self,
        session: MerchantSessionContext,
        metric: str,
        period: str | None = None,
        granularity: str = "day",
        segment: str | None = None,
    ) -> MetricSeries:
        del session
        current, _, label = metric_window(self._daily, period or "last_30_days")
        cleaned = metric.strip().lower().replace(" ", "_")
        segment_cleaned = (segment or "").strip().lower().replace(" ", "-") or None
        key = "excavator_hires" if cleaned in {"excavator_hires", "excavators"} else cleaned
        if key == "conversion" or key == "conversion_rate":

            def value_for(rows: list[dict[str, Any]]) -> float:
                traffic = sum(row["traffic"] for row in rows)
                orders = sum(row["orders"] for row in rows)
                return round(orders / traffic * 100, 2) if traffic else 0.0

        elif current and key in current[0]:

            def value_for(rows: list[dict[str, Any]]) -> float:
                return round(sum(float(row.get(key, 0)) for row in rows), 2)

        else:
            return MetricSeries(
                metric=cleaned,
                granularity="day",
                period=label,
                segment=segment_cleaned,
                points=[],
                note=f"this yard does not report {cleaned}",
            )
        if granularity == "week":
            points = [
                MetricPoint(
                    date=current[start]["date"], value=value_for(current[start : start + 7])
                )
                for start in range(0, len(current), 7)
            ]
        else:
            points = [MetricPoint(date=row["date"], value=value_for([row])) for row in current]
        unit = self._currency if cleaned in _MONEY_METRICS else None
        return MetricSeries(
            metric=cleaned,
            unit=unit,
            granularity="week" if granularity == "week" else "day",
            period=label,
            segment=segment_cleaned,
            points=points,
        )

    async def get_campaign_performance(
        self, session: MerchantSessionContext, campaign_id: str | None = None
    ) -> list[Campaign]:
        del session
        campaigns = list(self._campaigns.values())
        if campaign_id:
            campaigns = [c for c in campaigns if c.campaign_id == campaign_id]
        return campaigns

    async def search_listings(
        self,
        session: MerchantSessionContext,
        query: str,
        filters: ListingFilters | None = None,
        limit: int = 8,
    ) -> list[Listing]:
        universe = [listing.listing_id for listing in self.all_listings()]
        if ids := named_ids(query, universe):
            listings = [listing for pid in ids if (listing := self._listing(pid))]
        elif is_browse(query):
            listings = self.all_listings()
        else:
            shopper = ShoppingSessionContext(
                session_id=session.session_id, user_id="merchant-portal"
            )
            products = await self.storefront.search_products(
                shopper, query, SearchFilters(), limit=len(self.storefront.products)
            )
            listings = [
                listing for product in products if (listing := self._listing(product.product_id))
            ]
        return filter_listings(
            listings,
            filters,
            limit,
            sales_of=lambda listing_id: self._state_row(listing_id).get("hires_last_30d") or 0,
        )

    async def get_listing(
        self, session: MerchantSessionContext, listing_id: str
    ) -> ListingDetails | None:
        del session
        resolved = find_by_id(self.storefront.products, listing_id)
        listing = self._listing(resolved) if resolved else None
        if resolved is None or listing is None:
            return None
        product = self.storefront.products[resolved]
        row = self._state_row(resolved)
        return ListingDetails(
            **listing.model_dump(),
            long_description=product.long_description,
            review_snippets=product.review_highlights,
            sales_last_30d=row.get("hires_last_30d"),
            missing_attributes=row.get("missing_attributes") or [],
        )

    def _compute_alerts(self) -> list[InventoryAlert]:
        alerts: list[InventoryAlert] = []
        for product_id, _row in self._inventory.items():
            product = self.storefront.products.get(product_id)
            if product is None:
                continue
            state = self._state_row(product_id)
            stock = int(state.get("stock", 0))
            threshold = int(state.get("threshold", 1))
            if stock <= threshold:
                alerts.append(
                    InventoryAlert(
                        listing_id=product_id,
                        title=product.title,
                        kind="low_stock",
                        stock=stock,
                        threshold=threshold,
                        sales_last_30d=state.get("hires_last_30d"),
                    )
                )
            elif int(state.get("hires_last_30d") or 0) <= 1:
                alerts.append(
                    InventoryAlert(
                        listing_id=product_id,
                        title=product.title,
                        kind="slow_mover",
                        stock=stock,
                        threshold=threshold,
                        sales_last_30d=state.get("hires_last_30d"),
                    )
                )
        return alerts

    async def get_inventory_alerts(self, session: MerchantSessionContext) -> list[InventoryAlert]:
        del session
        return self._compute_alerts()

    async def get_order_issues(self, session: MerchantSessionContext) -> list[OrderIssue]:
        del session
        return list(self._issues)

    def _unit_cost(self, listing_id: str) -> float:
        product = self.storefront.products[listing_id]
        return round(product.price * 0.45, 2)

    async def get_pricing_context(
        self, session: MerchantSessionContext, listing_id: str
    ) -> PricingContext | None:
        del session
        product = self.storefront.products.get(listing_id)
        if product is None:
            return None
        cost = self._unit_cost(listing_id)
        return PricingContext(
            listing_id=listing_id,
            current_price=product.price,
            currency=product.currency,
            unit_cost=cost,
            margin_pct=margin_pct(product.price, cost),
            min_price=round(cost * 1.1, 2),
            max_price=round(product.price * 1.4, 2),
            min_price_basis="cost",
            max_price_delta_pct=self.config.max_price_delta_pct,
            max_promotion_discount_pct=self.config.max_promotion_discount_pct,
            demand_signal="steady",
        )

    async def stage_listing_update(
        self,
        session: MerchantSessionContext,
        listing_id: str,
        fields: dict[str, Any],
        note: str | None = None,
    ) -> StagedChange:
        listing = await self.get_listing(session, listing_id)
        if listing is None:
            raise ValueError(f"no listing {listing_id}")
        items = [
            ChangeItem(
                target=listing.listing_id,
                field=name,
                before=getattr(listing, name, listing.attributes.get(name)),
                after=value,
            )
            for name, value in fields.items()
        ]
        return self.ledger.stage(
            kind=ChangeKind.LISTING_UPDATE,
            summary=note or f"Update listing content on {listing.listing_id}",
            items=items,
            actor=session.operator,
            actor_kind=ActorKind.AGENT,
        )

    async def stage_price_update(
        self,
        session: MerchantSessionContext,
        items: list[PriceUpdateItem],
        note: str | None = None,
    ) -> StagedChange:
        change_items = []
        margin_impact = 0.0
        margins: list[tuple[float, float]] = []
        currency: str | None = None
        for item in items:
            resolved = find_by_id(self.storefront.products, item.listing_id)
            if resolved is None:
                raise ValueError(f"no listing {item.listing_id}")
            product = self.storefront.products[resolved]
            before = product.price
            if currency is None:
                currency = product.currency
            pace = (self._state_row(resolved).get("hires_last_30d") or 0) / 30
            margin_impact += (item.new_price - before) * pace * 7
            cost = self._unit_cost(resolved)
            margins.append((margin_pct(before, cost), margin_pct(item.new_price, cost)))
            change_items.append(
                ChangeItem(target=resolved, field="price", before=before, after=item.new_price)
            )
        return self.ledger.stage(
            kind=ChangeKind.PRICE_UPDATE,
            summary=note or f"Daily-rate update for {len(items)} listing(s)",
            items=change_items,
            actor=session.operator,
            actor_kind=ActorKind.AGENT,
            currency=currency,
            margin_impact=round(margin_impact, 2),
            margin_before_pct=margins[0][0] if len(margins) == 1 else None,
            margin_after_pct=margins[0][1] if len(margins) == 1 else None,
        )

    async def stage_inventory_action(
        self,
        session: MerchantSessionContext,
        items: list[InventoryActionItem],
        note: str | None = None,
    ) -> StagedChange:
        change_items = []
        for item in items:
            resolved = find_by_id(self.storefront.products, item.listing_id)
            if resolved is None:
                raise ValueError(f"no listing {item.listing_id}")
            row = self._state_row(resolved)
            if item.action == "restock":
                current: Any = int(row.get("stock", 1))
                after: Any = current + (item.quantity or 0)
                field = "stock"
            else:
                after = "paused" if item.action == "pause" else "active"
                field = "status"
                listing = self._listing(resolved)
                current = listing.status if listing else None
            change_items.append(
                ChangeItem(target=resolved, field=field, before=current, after=after)
            )
        return self.ledger.stage(
            kind=ChangeKind.INVENTORY_ACTION,
            summary=note or f"Availability action for {len(items)} listing(s)",
            items=change_items,
            actor=session.operator,
            actor_kind=ActorKind.AGENT,
        )

    async def stage_promotion(
        self, session: MerchantSessionContext, promotion: PromotionDraft
    ) -> StagedChange:
        items = []
        currency: str | None = None
        for requested_id in promotion.listing_ids:
            listing_id = find_by_id(self.storefront.products, requested_id)
            if listing_id is None:
                raise ValueError(f"no listing {requested_id}")
            product = self.storefront.products[listing_id]
            if currency is None:
                currency = product.currency
            promo_rate = round(product.price * (1 - promotion.discount_pct / 100), 2)
            items.append(
                ChangeItem(
                    target=listing_id, field="daily_rate", before=product.price, after=promo_rate
                )
            )
        change = self.ledger.stage(
            kind=ChangeKind.PROMOTION,
            summary=(
                f"{promotion.name} ({abs(promotion.discount_pct):.0f}% on daily rates, "
                f"{promotion.starts} to {promotion.ends})"
            ),
            items=items,
            actor=session.operator,
            actor_kind=ActorKind.AGENT,
            currency=currency,
        )
        self._promotion_windows[change.change_id] = {
            "starts": promotion.starts,
            "ends": promotion.ends,
            "discount_pct": promotion.discount_pct,
            "name": promotion.name,
        }
        return change

    async def stage_campaign(
        self, session: MerchantSessionContext, campaign: CampaignDraft
    ) -> StagedChange:
        return stage_campaign(
            self.ledger, self._campaigns, campaign, actor=session.operator, currency=self._currency
        )

    async def get_pending_changes(self, session: MerchantSessionContext) -> list[StagedChange]:
        del session
        return self.ledger.pending()

    async def apply_change(self, session: MerchantSessionContext, change_id: str) -> StagedChange:
        applied = self.ledger.apply(change_id, actor=session.operator)
        self._apply_to_live_state(applied)
        return applied

    async def discard_change(
        self,
        session: MerchantSessionContext,
        change_id: str,
        actor_kind: ActorKind = ActorKind.OPERATOR,
    ) -> StagedChange:
        discarded = self.ledger.discard(change_id, actor=session.operator, actor_kind=actor_kind)
        self._promotion_windows.pop(change_id, None)
        return discarded

    def _apply_to_live_state(self, change: StagedChange) -> None:
        for item in change.items:
            product = self.storefront.products.get(item.target)
            if product is not None and change.kind in {
                ChangeKind.PRICE_UPDATE,
                ChangeKind.INVENTORY_ACTION,
                ChangeKind.LISTING_UPDATE,
            }:
                row = self._state_row(item.target)
                if change.kind is ChangeKind.PRICE_UPDATE:
                    product.price = float(item.after)
                    product.attributes["daily_rate"] = str(int(product.price))
                elif change.kind is ChangeKind.INVENTORY_ACTION:
                    if item.field == "stock":
                        row["stock"] = int(row.get("stock", 1)) + (
                            int(item.after) - int(item.before or 0)
                        )
                        product.attributes["stock"] = str(row["stock"])
                        product.in_stock = row["stock"] > 0 and row.get("status") != "paused"
                    elif item.field == "status":
                        row["status"] = "paused" if item.after == "paused" else "active"
                        product.in_stock = item.after != "paused" and int(row.get("stock", 1)) > 0
                elif item.field in {"title", "short_description", "long_description", "category"}:
                    setattr(product, item.field, item.after)
                else:
                    product.attributes[item.field] = str(item.after)
            elif change.kind is ChangeKind.PROMOTION:
                window = self._promotion_windows.get(change.change_id, {})
                self.rate_overrides.setdefault(item.target, []).append(
                    {
                        "starts": window.get("starts"),
                        "ends": window.get("ends"),
                        "daily_rate": float(item.after),
                        "change_id": change.change_id,
                    }
                )
            elif change.kind is ChangeKind.CAMPAIGN:
                apply_campaign_item(self._campaigns, item)

    async def get_merchant_context(self, session: MerchantSessionContext) -> dict[str, Any] | None:
        counts = self._alert_counts()
        return {
            "yard": self.yard_name,
            "marketplace": self.storefront.store_name,
            "operator": session.operator,
            "currency": self._currency,
            "alerts": {
                "low_stock": counts.low_stock,
                "slow_movers": counts.slow_movers,
                "haulage_queue": len(self.storefront.haulage_queue()),
                "pending_changes": counts.pending_changes,
            },
        }

    def hire_calendar(self) -> dict[str, Any]:
        """Units on hire vs free for the portal calendar widget."""
        rows = []
        for listing_id, entry in self._calendar.items():
            product = self.storefront.products.get(listing_id)
            if product is None:
                continue
            rows.append(
                {
                    "listing_id": listing_id,
                    "title": product.title,
                    "units": int(entry.get("units") or self._state_row(listing_id).get("stock", 1)),
                    "weeks": entry.get("weeks") or [],
                }
            )
        queue = self.storefront.haulage_queue()
        week_start = "2026-09-01"
        on_hire = 0
        free = 0
        for entry in self._calendar.values():
            weeks = entry.get("weeks") or []
            match = next(
                (week for week in weeks if week.get("week_start") == week_start),
                weeks[0] if weeks else {},
            )
            on_hire += int(match.get("units_on_hire") or 0)
            free += int(match.get("units_free") or 0)
        start = date.fromisoformat(week_start)
        days = [
            {
                "date": (start + timedelta(days=offset)).isoformat(),
                "weekday": (start + timedelta(days=offset)).strftime("%a"),
                "on_hire": on_hire,
                "free": free,
                "fleet": on_hire + free,
            }
            for offset in range(7)
        ]
        return {
            "yard": self.yard_name,
            "window": self._calendar_window,
            "days": days,
            "listings": rows,
            "haulage_pending": len(queue),
            "staged_windows": staged_promotion_windows(self.ledger, self._promotion_windows),
        }
