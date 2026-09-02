// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";
import { Notice, PageHeader, Panel, useResource } from "web-shared";
import { approveHaulage, counterHaulage, fetchCalendar, fetchHaulage, type HaulageItem } from "@/lib/api";
import { formatUgx } from "@/lib/format";

export default function HaulageView({
  refreshKey,
  onRefresh,
}: {
  refreshKey: number;
  onRefresh: () => void;
}) {
  const { data, failed } = useResource(fetchHaulage, [refreshKey]);
  const { data: calendar } = useResource(fetchCalendar, [refreshKey]);
  const [selected, setSelected] = useState<HaulageItem | null>(null);
  const [counter, setCounter] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const queue = data?.queue ?? [];

  async function approve(item: HaulageItem) {
    const result = await approveHaulage(item.hire_id);
    setNote(
      result
        ? `${item.hire_id} approved at ${formatUgx(result.quote)}. Still uncharged.`
        : "Could not approve this haulage row.",
    );
    onRefresh();
  }

  async function counterQuote(item: HaulageItem) {
    const quote = Number(counter);
    if (!quote) return;
    const result = await counterHaulage(item.hire_id, quote);
    setNote(
      result
        ? `${item.hire_id} countered at ${formatUgx(result.quote)}. Still uncharged.`
        : "Could not counter this haulage row.",
    );
    onRefresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <PageHeader title="Haulage queue" subtitle="Agent proposes. You apply. Review each proposal, adjust if needed, and approve to update the hire." />
      {calendar?.days?.length ? (
        <Panel>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
            Units on hire vs free · {calendar.yard}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendar.days.map((day) => (
              <div
                key={day.date}
                className={`rounded-xl border px-2 py-2 text-center ${
                  day.weekday === "Fri" ? "border-(--amber) bg-(--accent-soft)" : "border-(--line) bg-white"
                }`}
              >
                <div className="text-[11px] text-(--ink-soft)">{day.weekday}</div>
                <div className="text-[13px] font-semibold">{day.date.slice(8)}</div>
                <div className="mt-1 text-[12px] tabular-nums">
                  {day.on_hire}/{day.fleet}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
      {failed ? <Notice>Could not load the haulage queue.</Notice> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-(--ink-soft)">
                <th className="pb-2 font-medium">Hire</th>
                <th className="pb-2 font-medium">Machine</th>
                <th className="pb-2 font-medium">Site</th>
                <th className="pb-2 font-medium">Distance</th>
                <th className="pb-2 font-medium">Quote</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr
                  key={item.hire_id}
                  className={`cursor-pointer border-t border-(--line) ${
                    selected?.hire_id === item.hire_id ? "bg-(--accent-soft)/50" : ""
                  }`}
                  onClick={() => {
                    setSelected(item);
                    setCounter(String(Math.round(item.quote)));
                  }}
                >
                  <td className="py-2.5">
                    <div className="font-semibold">{item.hire_id}</div>
                    <div className="text-[11px] text-(--ink-soft)">{item.created_at.slice(0, 16)}</div>
                  </td>
                  <td className="py-2.5">{item.title}</td>
                  <td className="py-2.5">{item.site ?? "—"}</td>
                  <td className="py-2.5 tabular-nums">{item.distance_km ?? "—"} km</td>
                  <td className="py-2.5 font-semibold text-(--amber)">{formatUgx(item.quote, true)}</td>
                </tr>
              ))}
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-(--ink-soft)">
                    No haulage rows waiting.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Panel>
        <aside className="rounded-2xl border border-(--line) bg-white p-4">
          {selected ? (
            <>
              <h2 className="eq-display text-xl font-bold text-(--navy)">Review {selected.hire_id}</h2>
              <p className="mt-2 text-[13px] text-(--ink-2)">
                {selected.from_yard ?? "Yard"} → {selected.site ?? "site"} · {selected.distance_km ?? "—"} km
              </p>
              <p className="mt-3 text-[13px]">
                Agent proposal: <span className="font-bold text-(--amber)">{formatUgx(selected.quote)}</span>
              </p>
              <p className="text-[12px] text-(--ink-soft)">Change from current: none until you counter.</p>
              <button type="button" className="btn-primary mt-4 w-full rounded-xl py-2.5 text-sm font-bold" onClick={() => void approve(selected)}>
                Approve haulage · {formatUgx(selected.quote, true)}
              </button>
              <div className="mt-3 flex gap-2">
                <input
                  value={counter}
                  onChange={(event) => setCounter(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-(--line) px-2 py-2 text-sm"
                  aria-label="Counter quote in UGX"
                />
                <button
                  type="button"
                  className="rounded-lg border border-(--line) px-3 text-sm font-semibold"
                  onClick={() => void counterQuote(selected)}
                >
                  Counter
                </button>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-(--ink-soft)">Select a hire to review the agent’s haulage quote.</p>
          )}
          <p className="mt-4 text-[11px] text-(--ink-soft)">
            The agent proposes and the operator applies, so rates stay aligned with yard rules. Nothing is paid from this screen.
          </p>
        </aside>
      </div>
      <div className="rounded-xl border border-(--amber) bg-(--accent-soft) px-4 py-3 text-[13px]">
        Agent proposes. You apply. Review each proposal, adjust if needed, and approve to update your hire and apply the haulage charge later on the host checkout.
      </div>
      {note ? <Notice>{note}</Notice> : null}
    </div>
  );
}
