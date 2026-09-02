// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Notice, PageHeader, Panel, useResource } from "web-shared";
import { fetchCalendar } from "@/lib/api";

export default function CalendarView({ refreshKey }: { refreshKey: number }) {
  const { data, failed } = useResource(fetchCalendar, [refreshKey]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <PageHeader title="Hire calendar" subtitle="Units on hire vs free at the yard. A staged rate window does not change these figures until you apply it." />
      {failed ? <Notice>Could not load the hire calendar.</Notice> : null}
      {data ? (
        <>
          <Panel>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {data.yard} · {data.window.from} – {data.window.to}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {data.days.map((day) => (
                <div key={day.date} className="rounded-xl border border-(--line) bg-white px-2 py-3 text-center">
                  <div className="text-[11px] text-(--ink-soft)">{day.weekday}</div>
                  <div className="text-[15px] font-bold text-(--navy)">{day.date.slice(8)}</div>
                  <div className="mt-2 text-[12px] tabular-nums text-(--ink-2)">
                    {day.on_hire} on hire
                  </div>
                  <div className="text-[12px] tabular-nums text-(--ok)">{day.free} free</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-(--ink-soft)">
                  <th className="pb-2 font-medium">Machine</th>
                  <th className="pb-2 font-medium">Units</th>
                  <th className="pb-2 font-medium">This week on hire</th>
                  <th className="pb-2 font-medium">Free</th>
                </tr>
              </thead>
              <tbody>
                {data.listings.map((listing) => {
                  const week = listing.weeks[1] ?? listing.weeks[0];
                  return (
                    <tr key={listing.listing_id} className="border-t border-(--line)">
                      <td className="py-2 font-semibold">{listing.title}</td>
                      <td className="py-2 tabular-nums">{listing.units}</td>
                      <td className="py-2 tabular-nums">{week?.units_on_hire ?? "—"}</td>
                      <td className="py-2 tabular-nums">{week?.units_free ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
