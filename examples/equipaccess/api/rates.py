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

# General haulage method price per kilometre, for rental machine classes that don't
# need a lowbed trailer (generators, scaffolding, mixers, compactors, forklifts,
# water tankers, ...). Calibrated so 18 km (Mukono yard -> Mukono industrial) quotes
# 240,000 UGX one-way, matching the fixture haulage row.
HAULAGE_PER_KM_UGX = 240_000 / 18

# Lowbed trailer method price per kilometre, for machine classes too heavy/tracked to
# self-drive (excavators, bulldozers, wheel loaders, graders, cranes). Calibrated
# against a real market quote: Kampala -> Bukomero is ~80-100 km by road and a lowbed
# quote for that run is UGX 1,500,000 -- 15,000 UGX/km * 100 km matches exactly.
LOWBED_PER_KM_UGX = 15_000
LOWBED_MACHINE_CLASSES = {"excavator", "bulldozer", "loader", "skid steer", "grader", "crane"}

# Yard-to-site road kilometres used when the customer names a yard city and a site city.
YARD_TO_SITE_KM: dict[tuple[str, str], int] = {
    ("mukono", "mukono"): 18,
    ("mukono", "kampala"): 22,
    ("mukono", "entebbe"): 48,
    ("mukono", "jinja"): 74,
    ("mukono", "gulu"): 320,
    ("mukono", "bukomero"): 118,
    ("kampala", "kampala"): 12,
    ("kampala", "mukono"): 22,
    ("kampala", "entebbe"): 40,
    ("kampala", "jinja"): 80,
    ("kampala", "bukomero"): 100,
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


def requires_lowbed(machine_class: str | None) -> bool:
    return bool(machine_class) and machine_class.strip().lower() in LOWBED_MACHINE_CLASSES


def haulage_rate_per_km_ugx(machine_class: str | None) -> float:
    return LOWBED_PER_KM_UGX if requires_lowbed(machine_class) else HAULAGE_PER_KM_UGX


# Kampala's urban/peri-urban belt -- same cities already used as yard/site rows above --
# gets a flat local delivery fee rather than the per-km/zone upcountry tiers.
KAMPALA_METRO_SITES = ("kampala", "ntinda", "namanve", "wakiso", "mukono", "entebbe")
SPARES_DELIVERY_KAMPALA_UGX = 10_000

# Upcountry spare-parts delivery: a courier/boda run, not a distance calc (no domestic
# Uganda courier publishes a public rate card -- DHL Domestic, Posta Uganda/EMS, and
# others all quote by zone/on request). Tiered by real road distance from Kampala,
# shaped like DHL Domestic Uganda's own AA/A/B/C zoning, bounded to the market range an
# operator actually quotes: UGX 30,000 nearby, up to UGX 100,000 far upcountry.
SPARES_DELIVERY_NEAR_UGX = 30_000  # ~<150 km: Jinja, Mityana, Mubende, Luweero, Masaka, Iganga, Kayunga, Bukomero/Kiboga, Lugazi, Njeru
SPARES_DELIVERY_MID_UGX = 60_000  # ~150-280 km: Soroti, Hoima, Kasese, Mbale, Fort Portal, Masindi
SPARES_DELIVERY_FAR_UGX = 100_000  # ~280+ km: Gulu, Mbarara, Arua, Kabale, Moroto, Kitgum, Adjumani, Kisoro

_SPARES_NEAR_TOWNS = (
    "jinja", "mityana", "mubende", "luweero", "luwero", "masaka", "iganga",
    "kayunga", "bukomero", "kiboga", "lugazi", "njeru", "mpigi",
)
_SPARES_MID_TOWNS = ("soroti", "hoima", "kasese", "mbale", "fort portal", "fortportal", "masindi")
_SPARES_FAR_TOWNS = (
    "gulu", "mbarara", "arua", "kabale", "moroto", "kitgum", "adjumani", "kisoro", "lira",
)


def spares_delivery_fee(site: str | None) -> float:
    """Kampala-metro: flat courier fee. Upcountry: zone-tiered courier fee (see
    SPARES_DELIVERY_* above). Free-text site, matched the same way as
    materials_delivery_fee -- there's no geocoding here, just keyword zones."""
    folded = (site or "").strip().lower()
    if not folded:
        return 0.0
    if any(town in folded for town in KAMPALA_METRO_SITES):
        return float(SPARES_DELIVERY_KAMPALA_UGX)
    if any(town in folded for town in _SPARES_FAR_TOWNS):
        return float(SPARES_DELIVERY_FAR_UGX)
    if any(town in folded for town in _SPARES_MID_TOWNS):
        return float(SPARES_DELIVERY_MID_UGX)
    if any(town in folded for town in _SPARES_NEAR_TOWNS):
        return float(SPARES_DELIVERY_NEAR_UGX)
    # Unrecognized upcountry text: quote the middle of the market range rather than
    # silently returning 0, which would look like delivery was free.
    return float(SPARES_DELIVERY_MID_UGX)


# Bulk construction-materials delivery (a truck load, not a courier parcel) -- mirrors
# the frontend's lib/format.ts materialsDeliveryFee() tiers exactly so a quote doesn't
# depend on which side of the app computed it.
MATERIALS_DELIVERY_NTINDA_UGX = 180_000
MATERIALS_DELIVERY_KAMPALA_UGX = 150_000
MATERIALS_DELIVERY_MUKONO_UGX = 120_000
MATERIALS_DELIVERY_DEFAULT_UGX = 180_000


def materials_delivery_fee(site: str | None) -> float:
    folded = (site or "").strip().lower()
    if not folded:
        return 0.0
    if "ntinda" in folded:
        return float(MATERIALS_DELIVERY_NTINDA_UGX)
    if "kampala" in folded or "namanve" in folded or "wakiso" in folded:
        return float(MATERIALS_DELIVERY_KAMPALA_UGX)
    if "mukono" in folded:
        return float(MATERIALS_DELIVERY_MUKONO_UGX)
    return float(MATERIALS_DELIVERY_DEFAULT_UGX)


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


def haulage_fee(kilometres: float | None, machine_class: str | None = None) -> float | None:
    """One-way haulage: shipping method price times distance. ``machine_class`` selects
    the lowbed rate for tracked/heavy plant (see LOWBED_MACHINE_CLASSES); omitted or an
    unrecognized class falls back to the general per-km rate."""
    if kilometres is None or kilometres <= 0:
        return None
    return float(round(haulage_rate_per_km_ugx(machine_class) * kilometres))


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
