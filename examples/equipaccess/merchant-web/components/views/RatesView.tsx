// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Notice, PageHeader, Panel, useResource } from "web-shared";
import { fetchListings } from "@/lib/api";
import { formatUgx } from "@/lib/format";

export default function RatesView({
  refreshKey,
  onAskAssistant,
}: {
  refreshKey: number;
  onAskAssistant: (text: string) => void;
}) {
  const { data, failed } = useResource(() => fetchListings(), [refreshKey]);
  const rentals = (data?.listings ?? []).filter((listing) => (listing.attributes?.listing_type ?? "Rent") === "Rent");
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <PageHeader
        title="Rates"
        subtitle="Daily, weekly, and monthly. Ask the assistant to stage a move — it does not apply until you approve the card."
      />
      {failed ? <Notice>Could not load rates.</Notice> : null}
      <Panel>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-(--ink-soft)">
              <th className="pb-2 font-medium">Machine</th>
              <th className="pb-2 font-medium">Daily</th>
              <th className="pb-2 font-medium">Weekly</th>
              <th className="pb-2 font-medium">Monthly</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rentals.map((listing) => (
              <tr key={listing.listing_id} className="border-t border-(--line)">
                <td className="py-2 font-semibold">{listing.title}</td>
                <td className="py-2 tabular-nums">{formatUgx(listing.price, true)}</td>
                <td className="py-2 tabular-nums">
                  {listing.attributes?.weekly_rate ? formatUgx(Number(listing.attributes.weekly_rate), true) : "—"}
                </td>
                <td className="py-2 tabular-nums">
                  {listing.attributes?.monthly_rate ? formatUgx(Number(listing.attributes.monthly_rate), true) : "—"}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    className="text-[12px] font-semibold underline"
                    onClick={() =>
                      onAskAssistant(
                        `Stage a small daily-rate change on ${listing.title} (${listing.listing_id}). Show the margin impact and do not apply it.`,
                      )
                    }
                  >
                    Stage change
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
