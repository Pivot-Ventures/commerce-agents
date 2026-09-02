// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { PageHeader, Panel } from "web-shared";

export default function CampaignsView({ onAskAssistant }: { onAskAssistant: (text: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <PageHeader
        title="Campaigns"
        subtitle="Drafts stay staged. The assistant cannot send a campaign or move money."
      />
      <Panel>
        <p className="text-[14px] text-(--ink-2)">
          Ask the yard assistant to draft a hire-week campaign. It will stage the draft on a preview card; you apply it.
        </p>
        <button
          type="button"
          className="btn-primary mt-3 rounded-xl px-3 py-2 text-sm font-bold"
          onClick={() =>
            onAskAssistant(
              "Draft a short campaign for the Mukono 20-ton excavator this month, modest budget, email to past site managers. Stage it as a draft.",
            )
          }
        >
          Draft a campaign
        </button>
      </Panel>
    </div>
  );
}
