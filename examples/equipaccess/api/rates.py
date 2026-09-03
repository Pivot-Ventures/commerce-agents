# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Hire-rate and haulage arithmetic for the ACME Equip demo. Catalog prices are a
daily rate in UGX; weekly and monthly rates are stored on the listing and applied as
whole periods (``ceil(days / 7)`` weeks, ``ceil(days / 30)`` months). One-way haulage
is ``method.price * distance``; the security deposit equals that one-way amount;
host checkout later charges to+from (twice the one-way)."""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Any

from shopping_agent import ProductDetails

RATE_DAILY = "Daily"
RATE_WEEKLY = "Weekly"
RATE_MONTHLY = "Monthly"
RATE_TYPES = (RATE_DAILY, RATE_WEEKLY, RATE_MONTHLY)

# Lowbed method price per kilometre so 18 km (Mukono yard → Mukono industrial)
# quotes 240,000 UGX one-way, matching the fixture haulage row.
HAULAGE_PER_KM_UGX = 240_000 / 18

# Yard-to-site road kilometres used when the customer names a yard city and a site city.
YARD_TO_SITE_KM: dict[tuple[str, str], int] = {
    ("mukono", "mukono"): 18,
    ("mukono", "kampala"): 22,
    ("mukono", "entebbe"): 48,
    ("mukono", "jinja"): 74,
    ("mukono", "gulu"): 320,
    ("kampala", "kampala"): 12,
    ("kampala", "mukono"): 22,
    ("kampala", "entebbe"): 40,
    ("kampala", "jinja"): 80,
    ("entebbe", "entebbe"): 10,
    ("entebbe", "kampala"): 40,
    ("entebbe", "mukono"): 48,
    ("jinja", "jinja"): 8,
    ("jinja", "mukono"): 74,
    ("jinja", "kampala"): 80,
    ("mukono", "ntinda"): 34,
    ("kampala", "ntinda"): 8,
    ("entebbe", "ntinda"): 42,
    ("mukono", "namanve"): 16,
    ("kampala", "namanve"): 18,
    ("kampala", "wakiso"): 20,
    ("mukono", "wakiso"): 28,
}


def parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def hire_days(start: date, end: date) -> int:
    """Inclusive hire days; a same-day hire is one day."""
    return max(1, (end - start).days + 1)


def recommended_rate_type(days: int) -> str:
    if days >= 28:
        return RATE_MONTHLY
    if days >= 7:
        return RATE_WEEKLY
    return RATE_DAILY


def normalize_rate_type(value: str | None) -> str:
    if not value:
        return RATE_DAILY
    folded = value.strip().lower()
    if folded.startswith("week"):
        return RATE_WEEKLY
    if folded.startswith("month"):
        return RATE_MONTHLY
    return RATE_DAILY


def periods_for(days: int, rate_type: str) -> int:
    if rate_type == RATE_WEEKLY:
        return math.ceil(days / 7)
    if rate_type == RATE_MONTHLY:
        return math.ceil(days / 30)
    return days


def unit_rate(product: ProductDetails, rate_type: str) -> float:
    """The catalog rate for one machine for one period of ``rate_type``."""
    attrs = product.attributes
    if rate_type == RATE_WEEKLY:
        return float(attrs.get("weekly_rate") or product.price * 7)
    if rate_type == RATE_MONTHLY:
        return float(attrs.get("monthly_rate") or product.price * 30)
    return float(attrs.get("daily_rate") or product.price)


def laravel_daily_times_days(list_price: float, days: int) -> float:
    """What live ``GET /api/rentals/rate`` does: treat a weekly or monthly list
    price as a daily figure and multiply by days. Fixture quotes use ``quote_hire``
    (whole weeks or months) so a 10-day weekly hire is two weekly periods."""
    return round(float(list_price) * max(1, days), 2)


def quote_hire(product: ProductDetails, days: int, rate_type: str | None = None) -> dict[str, Any]:
    """Period price for one machine. ``rate_type`` defaults to the listing's own rate,
    then to the duration recommendation."""
    chosen = normalize_rate_type(rate_type or product.attributes.get("rate_type") or "")
    if not rate_type and chosen == RATE_DAILY:
        chosen = recommended_rate_type(days)
    periods = periods_for(days, chosen)
    rate = unit_rate(product, chosen)
    return {
        "rate_type": chosen,
        "periods": periods,
        "unit_rate": rate,
        "quoted_total": round(rate * periods, 2),
    }


def haulage_km(yard: str | None, site: str | None, explicit: float | None = None) -> float | None:
    if explicit is not None and explicit > 0:
        return explicit
    if not yard or not site:
        return None
    return YARD_TO_SITE_KM.get((yard.strip().lower(), site.strip().lower()))


def haulage_fee(kilometres: float | None) -> float | None:
    """One-way haulage: shipping method price times distance."""
    if kilometres is None or kilometres <= 0:
        return None
    return float(round(HAULAGE_PER_KM_UGX * kilometres))


def haulage_round_trip(one_way: float | None) -> float | None:
    """To+from haulage charged later on the host checkout, not in the assistant."""
    if one_way is None:
        return None
    return float(one_way * 2)


def ranges_overlap(start_a: date, end_a: date, start_b: date, end_b: date) -> bool:
    return start_a <= end_b and start_b <= end_a


def default_hire_window(today: date, days: int = 10) -> tuple[date, date]:
    """A dated window starting next Monday (or today if it is Monday), ``days`` long."""
    weekday = today.weekday()
    start = today if weekday == 0 else today + timedelta(days=(7 - weekday))
    end = start + timedelta(days=days - 1)
    return start, end
