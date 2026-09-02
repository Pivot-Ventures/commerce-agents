// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { KindStyle, Tone } from "web-shared";
import type { InventoryAlert, ListingStatus, OrderIssue } from "./types";

export const ISSUE_KINDS: Record<OrderIssue["kind"], KindStyle> = {
  delayed: { label: "Delayed", icon: "truck", tone: "warn" },
  return_spike: { label: "Return spike", icon: "return", tone: "danger" },
  buyer_message: { label: "Buyer message", icon: "message", tone: "info" },
  damaged: { label: "Damaged", icon: "alert", tone: "danger" },
};

export const INVENTORY_KINDS: Record<InventoryAlert["kind"], KindStyle> = {
  low_stock: { label: "Low stock", icon: "low", tone: "warn" },
  slow_mover: { label: "Slow mover", icon: "clock", tone: "muted" },
};

export const LISTING_STATUS: Record<ListingStatus, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "ok" },
  paused: { label: "Paused", tone: "muted" },
  draft: { label: "Draft", tone: "info" },
  out_of_stock: { label: "On hire / out", tone: "danger" },
};
