// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Notice, PageHeader, Panel, Pill, useResource } from "web-shared";
import { fetchListings } from "@/lib/api";
import { formatUgx } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/kinds";

export default function ListingsView({
  refreshKey,
  onAskAssistant,
}: {
  refreshKey: number;
  onAskAssistant: (text: string) => void;
}) {
  const { data, failed } = useResource(() => fetchListings(), [refreshKey]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <PageHeader title="Listings" subtitle="Hire machines, sale units, and spare parts at this yard." />
      {failed ? <Notice>Could not load listings.</Notice> : null}
      <Panel>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-(--ink-soft)">
              <th className="pb-2 font-medium">Machine</th>
              <th className="pb-2 font-medium">Daily</th>
              <th className="pb-2 font-medium">Stock</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.listings ?? []).map((listing) => {
              const status = LISTING_STATUS[listing.status];
              return (
                <tr key={listing.listing_id} className="border-t border-(--line)">
                  <td className="py-2">
                    <button
                      type="button"
                      className="text-left font-semibold text-(--navy)"
                      onClick={() => onAskAssistant(`Review listing ${listing.listing_id} (${listing.title}).`)}
                    >
                      {listing.title}
                    </button>
                    <div className="text-[11px] text-(--ink-soft)">{listing.listing_id}</div>
                  </td>
                  <td className="py-2 tabular-nums">{formatUgx(listing.price, true)}</td>
                  <td className="py-2 tabular-nums">{listing.stock}</td>
                  <td className="py-2">
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
