// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Notice, PageHeader, Panel, Pill, useResource } from "web-shared";
import { fetchAlerts, fetchListings } from "@/lib/api";
import { INVENTORY_KINDS } from "@/lib/kinds";

export default function InventoryView({
  refreshKey,
  onAskAssistant,
}: {
  refreshKey: number;
  onAskAssistant: (text: string) => void;
}) {
  const { data, failed } = useResource(() => fetchListings(), [refreshKey]);
  const { data: alerts } = useResource(fetchAlerts, [refreshKey]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <PageHeader title="Inventory" subtitle="Stock at the yard. A restock is staged until you apply it." />
      {failed ? <Notice>Could not load inventory.</Notice> : null}
      {(alerts?.inventory ?? []).length ? (
        <Panel>
          <h2 className="mb-2 font-semibold">Alerts</h2>
          <ul className="space-y-2 text-[13px]">
            {alerts?.inventory.map((alert) => (
              <li key={`${alert.listing_id}-${alert.kind}`} className="flex justify-between gap-2">
                <span>
                  {alert.title} · {INVENTORY_KINDS[alert.kind].label}
                </span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => onAskAssistant(`Stage a restock for ${alert.title} (${alert.listing_id}) from its hire pace. Preview only.`)}
                >
                  Stage restock
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-(--ink-soft)">
              <th className="pb-2 font-medium">Machine</th>
              <th className="pb-2 font-medium">Stock</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.listings ?? []).map((listing) => (
              <tr key={listing.listing_id} className="border-t border-(--line)">
                <td className="py-2 font-semibold">{listing.title}</td>
                <td className="py-2 tabular-nums">{listing.stock}</td>
                <td className="py-2">
                  <Pill tone={listing.stock <= 1 ? "warn" : "ok"}>{listing.stock <= 0 ? "Out" : "In yard"}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
