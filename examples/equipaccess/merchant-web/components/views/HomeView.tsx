// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { formatMoney, Notice, PageHeader, Panel, StatTile, useResource } from "web-shared";
import { fetchCalendar, fetchHaulage } from "@/lib/api";
import { formatUgx } from "@/lib/format";
import type { OverviewResponse } from "@/lib/types";

export default function HomeView({
  data,
  failed,
  operator,
  onAskAssistant,
  onNavigate,
  refreshKey,
}: {
  data: OverviewResponse | null;
  failed: boolean;
  operator?: string;
  onAskAssistant: (text: string) => void;
  onNavigate: (view: "haulage" | "calendar" | "rates") => void;
  refreshKey: number;
}) {
  const { data: haulage } = useResource(fetchHaulage, [refreshKey]);
  const { data: calendar } = useResource(fetchCalendar, [refreshKey]);
  const snapshot = data?.snapshot;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <PageHeader
        title={`Morning at the yard${operator ? `, ${operator}` : ""}`}
        subtitle={data?.yard ?? "ACME Plant Hire — Mukono"}
      />
      {failed ? <Notice>Could not load the overview.</Notice> : null}
      {snapshot ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Hire sales"
            value={formatMoney(snapshot.sales, snapshot.currency ?? "UGX", { whole: true })}
            changePct={snapshot.sales_change_pct}
          />
          <StatTile label="Hires" value={String(snapshot.orders)} />
          <StatTile label="Haulage queue" value={String(data?.haulage_pending ?? haulage?.queue.length ?? 0)} />
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <h2 className="font-semibold text-(--navy)">Haulage waiting</h2>
          <ul className="mt-2 space-y-2 text-[13px]">
            {(haulage?.queue ?? []).slice(0, 4).map((item) => (
              <li key={item.hire_id} className="flex justify-between gap-2">
                <span>{item.hire_id} · {item.title}</span>
                <span className="text-(--amber)">{formatUgx(item.quote, true)}</span>
              </li>
            ))}
            {(haulage?.queue.length ?? 0) === 0 ? <li className="text-(--ink-soft)">Queue is clear.</li> : null}
          </ul>
          <button type="button" className="mt-3 text-[13px] font-semibold text-(--navy) underline" onClick={() => onNavigate("haulage")}>
            Open haulage queue
          </button>
        </Panel>
        <Panel>
          <h2 className="font-semibold text-(--navy)">On hire vs free</h2>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {(calendar?.days ?? []).map((day) => (
              <div key={day.date} className="rounded-lg bg-(--well) px-1 py-2 text-center text-[11px]">
                <div>{day.weekday}</div>
                <div className="font-semibold">{day.on_hire}/{day.fleet}</div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 text-[13px] font-semibold text-(--navy) underline" onClick={() => onNavigate("calendar")}>
            Open hire calendar
          </button>
        </Panel>
      </div>
      <Panel>
        <p className="text-[13px] text-(--ink-2)">
          Rate changes stay staged until you apply them on the preview card. The assistant cannot pay agents or move money.
        </p>
        <button
          type="button"
          className="btn-primary mt-3 rounded-xl px-3 py-2 text-sm font-bold"
          onClick={() => onAskAssistant("Stage a modest weekly-rate change on the Mukono 20-ton excavator. Show the impact and do not apply it.")}
        >
          Stage a rate change
        </button>
      </Panel>
    </div>
  );
}
