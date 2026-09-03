// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EquipAccessLogo, Notice, useDeskSession, useResource } from "web-shared";
import { agentApi, closeAgentHire, fetchAgentDesk } from "@/lib/agent-api";

const BRAND = "#F15A24";
const NAVY = "#0B1F3A";

export default function AgentDeskPage() {
  const router = useRouter();
  const desk = useDeskSession(agentApi, "agent");
  const [refresh, setRefresh] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const { data, failed } = useResource(desk.sessionId ? fetchAgentDesk : null, [desk.sessionId, refresh]);

  useEffect(() => {
    if (desk.ready && !desk.sessionId) router.replace("/agent/login");
  }, [desk.ready, desk.sessionId, router]);

  if (!desk.ready || !desk.sessionId) {
    return <p className="p-8 text-[14px] text-(--ink-soft)">Opening the agent desk…</p>;
  }

  async function close(hireId: string) {
    const result = await closeAgentHire(hireId);
    setNote(result ? `${hireId} marked ${result.status}.` : `Could not close ${hireId}.`);
    setRefresh((value) => value + 1);
  }

  return (
    <div className="min-h-dvh bg-[#f7f4ee]">
      <header className="flex items-center justify-between gap-4 px-6 py-4" style={{ background: NAVY }}>
        <EquipAccessLogo onDark />
        <div className="flex items-center gap-3 text-white">
          <span className="text-[13px]">{desk.name ?? "Agent"}</span>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white"
            style={{ background: BRAND }}
            onClick={() => {
              desk.signOut();
              router.replace("/agent/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-[12px] font-semibold text-white">
          <i aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND }} />
          Agent
        </span>
        <h1 className="eq-display mt-3 text-4xl font-bold" style={{ color: NAVY }}>
          Assigned orders
        </h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">
          {data?.note ?? "Track assigned hires and close deliveries. This desk does not move money."}
        </p>
        {failed ? <Notice>Could not load assigned orders.</Notice> : null}
        <ul className="mt-6 space-y-3">
          {(data?.assigned ?? []).map((hire) => (
            <li key={hire.hire_id} className="flex items-center justify-between gap-4 rounded-2xl border border-(--line) bg-white p-4">
              <div>
                <div className="font-semibold" style={{ color: NAVY }}>
                  {hire.hire_id}
                </div>
                <div className="text-[13px] text-(--ink-soft)">
                  {hire.title ?? "Hire"} · {hire.site ?? "site"} · {hire.status?.replaceAll("_", " ")}
                </div>
              </div>
              {hire.status === "delivered" ? (
                <span className="text-[13px] font-semibold text-[#1f7a4a]">Delivered</span>
              ) : (
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-[13px] font-bold text-white"
                  style={{ background: BRAND }}
                  onClick={() => void close(hire.hire_id)}
                >
                  Close delivery
                </button>
              )}
            </li>
          ))}
        </ul>
        {(data?.assigned ?? []).length === 0 ? (
          <p className="mt-6 text-[14px] text-(--ink-soft)">No hires attached to this agent yet.</p>
        ) : null}
        {note ? <Notice>{note}</Notice> : null}
      </main>
    </div>
  );
}
