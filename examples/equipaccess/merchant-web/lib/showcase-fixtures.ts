// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { ChangePreviewPayload, DigestPayload } from "./types";

const digest: DigestPayload = {
  title: "Morning digest",
  items: [
    {
      kind: "order_issue",
      ref_id: "HIRE-7821",
      headline: "HIRE-7821 needs haulage review — Mukono 20-ton to site, 240k UGX",
      why_it_matters: "The agent proposed the quote. A person at the yard approves or counters it.",
    },
    {
      kind: "metric",
      headline: "Excavator hires are the yard's main volume this week",
      why_it_matters: "The Mukono 20-ton is the listing site managers ask for first.",
    },
  ],
};

const change_preview: ChangePreviewPayload = {
  change_id: "chg-equip-1",
  headline: "Stage a weekly-rate move on AE-EXC-101",
  note: "Staged only. Apply from this card — the assistant does not write the live rate.",
  change: {
    change_id: "chg-equip-1",
    kind: "price_update",
    status: "staged",
    summary: "Daily rate on ACME Iron 20-ton Excavator (AE-EXC-101)",
    items: [{ target: "AE-EXC-101", field: "price", before: 180000, after: 170000 }],
    created_at: "2026-09-02",
    created_by: "Mercy",
    created_by_kind: "agent",
    currency: "UGX",
  },
};

export const SHOWCASE = { digest, change_preview };
