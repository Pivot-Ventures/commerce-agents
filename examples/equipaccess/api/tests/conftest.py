# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

from datetime import date

import pytest

from demo_common.storefront_fixtures import load_json
from demo_common.tests.fixtures import *  # noqa: F403
from equipaccess.api import main as main_module
from equipaccess.api.agent_config import build_merchant_config
from equipaccess.api.merchant import IDENTITY, create_merchant_router
from equipaccess.api.mock_equipaccess import DATA_DIR, MockEquipAccess
from equipaccess.api.mock_merchant import MockEquipMerchant

PINNED_TODAY = date.fromisoformat(load_json(DATA_DIR, "catalog.json")["dates_anchored_to"])


@pytest.fixture(scope="session")
def main():
    return main_module


@pytest.fixture(scope="session")
def make_storefront():
    return lambda: MockEquipAccess(today=PINNED_TODAY)


@pytest.fixture
def merchant(backend) -> MockEquipMerchant:
    return MockEquipMerchant(backend, build_merchant_config("ACME Equip"))


@pytest.fixture(scope="session")
def merchant_identity():
    return IDENTITY


@pytest.fixture(scope="session")
def make_merchant_router():
    return create_merchant_router


@pytest.fixture(scope="session")
def extra_public_routes() -> set[str]:
    return {"/api/admin/session", "/api/admin/health"}


@pytest.fixture(scope="session")
def restockable_listing() -> str:
    return "AE-GEN-502"


@pytest.fixture(scope="session")
def cart_product() -> str:
    return "AE-PRT-010"


@pytest.fixture(scope="session")
def relevance_probe() -> tuple[str, str, str, set[str]]:
    return ("20-ton excavator mukono", "rating", "AE-EXC-101", {"AE-SAL-110", "AE-PRT-010"})


@pytest.fixture(scope="session")
def showcase_stamps() -> set[str]:
    return {
        "hire_start",
        "hire_end",
        "quoted_total",
        "units_left_for_dates",
        "number_of_days",
        "recommended_rate_type",
    }
