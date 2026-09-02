# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The ACME Equip deployment's two agent configs."""

from __future__ import annotations

from demo_common import host_approval_default
from merchant_agent import MerchantAgentConfig
from shopping_agent import ShoppingAgentConfig

_MERCHANT_DEFAULTS = MerchantAgentConfig()

_POLICY_TERMS = (
    "deposit",
    "haulage",
    "operator",
    "fuel",
    "insurance",
    "hire period",
    "rate type",
)

_METRICS_TERMS = (
    "haulage",
    "on hire",
    "units free",
    "hire calendar",
    "daily rate",
    "weekly rate",
    "yard",
)


def build_shopping_config() -> ShoppingAgentConfig:
    return ShoppingAgentConfig(
        brand_name="ACME Equip",
        assistant_name="Hire assistant",
        brand_voice="plain-spoken, site-ready, and clear about what is included",
        domain_search_notes=(
            "This catalog is hire-first construction equipment in Uganda. When the "
            "customer has named dates, pass ISO filters.attributes['start_date'] and "
            "['end_date'] (and ['duration_days'] when they named a length without an "
            "end date) on every search — results and prices are quotes for that window, "
            "not catalog constants. Pass location as filters.attributes['location'] "
            "(Mukono, Kampala, Entebbe, Jinja, Gulu) and the machine class as "
            "filters.attributes['machine_class'] (excavator, loader, dump truck, "
            "compactor, generator, scaffolding, crane, mixer, forklift). Default intent "
            "is hire: do not return Sale or spare-part listings unless the customer "
            "clearly asked to buy. When they ask for transport to site, pass "
            "filters.attributes['include_haulage']='yes' and the site as "
            "['site_location'], then call get_fulfillment_options. After dates are "
            "known, a first add_to_cart books that window; quantity is machines, not "
            "days. checkout stages a hire request and charges nothing."
        ),
        policy_intent_terms=ShoppingAgentConfig().policy_intent_terms + _POLICY_TERMS,
    )


def build_merchant_config(store_name: str) -> MerchantAgentConfig:
    return MerchantAgentConfig(
        brand_name=store_name,
        require_host_approval=host_approval_default(),
        approval_surface="the Approve button on the change preview card",
        metrics_intent_terms=_MERCHANT_DEFAULTS.metrics_intent_terms + _METRICS_TERMS,
        price_bearing_fields=_MERCHANT_DEFAULTS.price_bearing_fields
        + ("daily_rate", "weekly_rate", "monthly_rate"),
        listing_update_blocked_fields=_MERCHANT_DEFAULTS.listing_update_blocked_fields
        + ("daily_rate", "weekly_rate", "monthly_rate"),
    )
