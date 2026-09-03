// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useState } from "react";
import { Notice, useResource } from "web-shared";
import { approveHaulage, counterHaulage, fetchCalendar, fetchHaulage, type HaulageItem } from "@/lib/api";
import { formatUgx } from "@/lib/format";

function machineMark(title?: string) {
  const hay = (title ?? "").toLowerCase();
  if (hay.includes("excavator")) return "EX";
  if (hay.includes("loader")) return "WL";
  if (hay.includes("dump") || hay.includes("truck")) return "DT";
  if (hay.includes("generator")) return "GN";
  return "AE";
}

function etaMinutes(km: number | null | undefined) {
  if (!km) return null;
  return Math.max(15, Math.round((km * 2) / 5) * 5);
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path d="M3 8.2 6.4 11.5 13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path d="M9.6 3.2 12.8 6.4 5.5 13.7H2.3v-3.2zM8.4 4.4l3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function RouteSketch({ from, to }: { from: string; to: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-(--line) bg-[#eef3e8]">
      <svg viewBox="0 0 320 120" className="h-[120px] w-full" role="img" aria-label={`Route from ${from} to ${to}`}>
        <rect width="320" height="120" fill="#e8efe3" />
        <path d="M0 78 Q80 70 140 62 T280 40" fill="none" stroke="#c5d0b8" strokeWidth="14" />
        <path d="M20 86 L300 28" fill="none" stroke="#0b1f3a" strokeWidth="3" strokeDasharray="6 5" />
        <circle cx="36" cy="84" r="7" fill="#f5a623" stroke="#0b1f3a" strokeWidth="2" />
        <circle cx="286" cy="32" r="7" fill="#0b1f3a" />
        <text x="46" y="108" fontSize="10" fill="#0b1f3a" fontWeight="600">
          Your yard
        </text>
        <text x="210" y="18" fontSize="10" fill="#0b1f3a" fontWeight="600">
          Site
        </text>
      </svg>
      <div className="grid grid-cols-2 gap-2 border-t border-(--line) bg-white px-3 py-2 text-[12px]">
        <div>
          <div className="text-(--ink-soft)">Your yard</div>
          <div className="font-semibold text-(--navy)">{from}</div>
        </div>
        <div className="text-right">
          <div className="text-(--ink-soft)">Customer site</div>
          <div className="font-semibold text-(--navy)">{to}</div>
        </div>
      </div>
    </div>
  );
}

export default function HaulageView({
  refreshKey,
  onRefresh,
  onOpenCalendar,
}: {
  refreshKey: number;
  onRefresh: () => void;
  onOpenCalendar?: () => void;
}) {
  const { data, failed } = useResource(fetchHaulage, [refreshKey]);
  const { data: calendar } = useResource(fetchCalendar, [refreshKey]);
  const [selected, setSelected] = useState<HaulageItem | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counter, setCounter] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const queue = data?.queue ?? [];

  useEffect(() => {
    if (!queue.length) {
      setSelected(null);
      return;
    }
    setSelected((current) => {
      const still = current && queue.find((row) => row.hire_id === current.hire_id);
      return still ?? queue[0];
    });
  }, [queue]);

  useEffect(() => {
    if (selected) setCounter(String(Math.round(selected.quote)));
  }, [selected]);

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
    setCounterOpen(false);
    onRefresh();
  }

  function pick(item: HaulageItem) {
    setSelected(item);
    setCounterOpen(false);
    setCounter(String(Math.round(item.quote)));
  }

  const minutes = etaMinutes(selected?.distance_km);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-(--navy)">
            ACME Plant Hire · <span className="text-(--amber)">Mukono</span>
          </div>
          <h1 className="eq-display mt-1 text-3xl font-bold text-(--navy)">
            Haulage review queue
            {queue.length ? (
              <span className="ml-2 align-middle rounded-full bg-(--amber) px-2 py-0.5 text-[14px] font-bold text-(--navy)">
                {queue.length}
              </span>
            ) : null}
          </h1>
        </div>
      </div>

      {calendar?.days?.length ? (
        <section className="rounded-2xl border border-(--line) bg-white p-4 shadow-(--shadow-sm)">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              Units on hire vs free
            </div>
            {onOpenCalendar ? (
              <button
                type="button"
                className="text-[12px] font-semibold text-(--navy) underline-offset-2 hover:underline"
                onClick={onOpenCalendar}
              >
                View full calendar
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendar.days.map((day) => {
              const fleet = day.fleet || 1;
              const hirePct = Math.round((day.on_hire / fleet) * 100);
              const highlight = day.weekday === "Fri";
              return (
                <div
                  key={day.date}
                  className={`rounded-xl border px-2 py-2 ${
                    highlight ? "border-(--amber) bg-(--accent-soft)" : "border-(--line) bg-(--cream)"
                  }`}
                >
                  <div className="text-[11px] text-(--ink-soft)">
                    {day.weekday} {day.date.slice(8)}
                  </div>
                  <div className="mt-2 flex h-12 items-end gap-0.5">
                    <div className="w-1/2 rounded-t bg-(--navy)" style={{ height: `${Math.max(8, hirePct)}%` }} />
                    <div
                      className="w-1/2 rounded-t bg-[#c8cdd3]"
                      style={{ height: `${Math.max(8, 100 - hirePct)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-center text-[11px] tabular-nums text-(--navy)">
                    {day.on_hire}/{day.fleet}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {failed ? <Notice>Could not load the haulage queue.</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-2xl border border-(--line) bg-white shadow-(--shadow-sm)">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-(--line) text-(--ink-soft)">
                <th className="px-3 py-2.5 font-medium">Hire</th>
                <th className="px-3 py-2.5 font-medium">Machine</th>
                <th className="px-3 py-2.5 font-medium">Site</th>
                <th className="px-3 py-2.5 font-medium">Distance</th>
                <th className="px-3 py-2.5 font-medium">Quote</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => {
                const active = selected?.hire_id === item.hire_id;
                return (
                  <tr
                    key={item.hire_id}
                    className={`border-t border-(--line) ${active ? "bg-(--accent-soft)/70" : "hover:bg-(--cream)"}`}
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-(--navy)">{item.hire_id}</div>
                      <div className="text-[11px] text-(--ink-soft)">{item.created_at.replace("T", " ").slice(0, 16)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-(--navy) text-[11px] font-bold text-(--amber)">
                          {machineMark(item.title)}
                        </span>
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div>{item.site ?? "—"}</div>
                      <div className="text-[11px] text-(--ink-soft)">{item.site_city ?? item.from_yard ?? "Yard"}</div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{item.distance_km ?? "—"} km</td>
                    <td className="px-3 py-3 font-semibold text-(--amber)">{formatUgx(item.quote, true)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => pick(item)}
                        className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${
                          active
                            ? "bg-(--amber) text-(--navy)"
                            : "border border-(--line) bg-white text-(--navy)"
                        }`}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-(--ink-soft)">
                    No haulage rows waiting.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <aside className="rounded-2xl border border-(--line) bg-white p-4 shadow-(--shadow-sm)">
          {selected ? (
            <>
              <h2 className="eq-display text-xl font-bold text-(--navy)">Review {selected.hire_id}</h2>
              <p className="mt-1 text-[12px] text-(--ink-soft)">Haulage distance</p>
              <div className="mt-2">
                <RouteSketch from={selected.from_yard ?? "Mukono"} to={selected.site ?? "site"} />
              </div>
              <p className="mt-2 text-[13px] text-(--ink-2)">
                {selected.distance_km ?? "—"} km
                {selected.via
                  ? ` via ${selected.via}`
                  : selected.from_yard && selected.site
                    ? ` via ${selected.from_yard}–${selected.site}`
                    : ""}
                {minutes ? ` · ~${minutes} min` : ""}
              </p>
              <div className="mt-4 rounded-xl bg-(--well) px-3 py-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                  Agent proposal
                </div>
                <div className="eq-display text-3xl font-bold text-(--amber)">{formatUgx(selected.quote, true)}</div>
                <span className="mt-1 inline-block rounded-full bg-(--ok-soft) px-2 py-0.5 text-[11px] font-semibold text-(--ok)">
                  + Change from current: none
                </span>
              </div>
              <button
                type="button"
                className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
                onClick={() => void approve(selected)}
              >
                <CheckIcon />
                Approve haulage · {formatUgx(selected.quote, true)}
              </button>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-(--line) py-2.5 text-sm font-semibold"
                onClick={() => setCounterOpen((open) => !open)}
              >
                <PencilIcon />
                Counter with different rate
              </button>
              {counterOpen ? (
                <div className="mt-2 flex gap-2">
                  <input
                    value={counter}
                    onChange={(event) => setCounter(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-(--line) px-2 py-2 text-sm"
                    aria-label="Counter quote in UGX"
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-(--navy) px-3 text-sm font-semibold"
                    onClick={() => void counterQuote(selected)}
                  >
                    Apply counter
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-[13px] text-(--ink-soft)">Select a hire to review the agent’s haulage quote.</p>
          )}
          <p className="mt-4 flex gap-2 rounded-lg bg-(--cream) px-3 py-2 text-[11px] text-(--ink-soft)">
            <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-(--navy)" aria-hidden>
              <path
                d="M8 2 13 4.2v4.3c0 3.2-2.1 5.1-5 5.5-2.9-.4-5-2.3-5-5.5V4.2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <span>
              Agent proposes. You apply. This helps keep rates fair, accurate and aligned with your
              store rules. Nothing is paid from this screen.
            </span>
          </p>
        </aside>
      </div>

      <div className="rounded-xl border border-(--amber) bg-(--accent-soft) px-4 py-3 text-[13px] font-medium text-(--navy)">
        Agent proposes. You apply. Review each proposal, adjust if needed, and approve to update your hire and
        apply the haulage charge later on the host checkout.
      </div>
      {note ? <Notice>{note}</Notice> : null}
    </div>
  );
}
