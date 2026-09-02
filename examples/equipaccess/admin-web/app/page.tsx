// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";
import { Notice, useResource, useSession } from "web-shared";
import {
  api,
  decideListing,
  attachHireAgent,
  fetchAgents,
  fetchCustomers,
  fetchHaulageDesk,
  fetchListings,
  fetchOverview,
  fetchPayouts,
  fetchRoles,
  fetchShipping,
  fetchStores,
  tryPayPayout,
  tryPayShipping,
  type AdminListing,
} from "@/lib/api";

type View =
  | "dashboard"
  | "listings"
  | "stores"
  | "agents"
  | "desk"
  | "customers"
  | "payouts"
  | "shipping"
  | "roles";

const NAV: { id: View; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "listings", label: "Listing approvals" },
  { id: "stores", label: "Stores" },
  { id: "agents", label: "Agents" },
  { id: "desk", label: "Haulage desk" },
  { id: "customers", label: "Customers" },
  { id: "payouts", label: "Payouts" },
  { id: "shipping", label: "Shipping" },
  { id: "roles", label: "Roles" },
];

function money(value: number) {
  return `${Math.round(value).toLocaleString("en-UG")} UGX`;
}

export default function AdminPage() {
  const session = useSession(api);
  const [view, setView] = useState<View>("listings");
  const [refresh, setRefresh] = useState(0);
  const ready = Boolean(session.sessionId);

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-[230px] shrink-0 flex-col bg-(--navy) px-4 py-5 text-[#e8eef6]">
        <div className="eq-display text-[22px] font-bold tracking-wide text-white">EQUIPACCESS</div>
        <div className="text-[11px] text-[#9aa8b8]">Admin portal</div>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Admin views">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`rounded-lg px-3 py-2 text-left text-[14px] ${
                view === item.id ? "bg-[#f5a62322] font-semibold text-(--amber)" : "text-[#d5dce4]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto text-[11px] text-[#9aa8b8]">
          © 2026 EquipAccess Uganda
          <div>All rights reserved</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-(--line) bg-white px-6 py-3">
          <span className="text-[13px] font-semibold text-(--navy)">BTIC · Super admin</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-(--navy) text-[12px] font-bold text-(--amber)">
            BT
          </span>
        </header>
        <main className="grid flex-1 grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_240px]">
          {ready && view === "dashboard" ? <Dashboard refresh={refresh} onOpenListings={() => setView("listings")} /> : null}
          {ready && view === "listings" ? <Approvals refresh={refresh} onRefresh={() => setRefresh((n) => n + 1)} /> : null}
          {ready && view === "stores" ? <Stores refresh={refresh} /> : null}
          {ready && view === "agents" ? <Agents refresh={refresh} /> : null}
          {ready && view === "desk" ? <HaulageDesk refresh={refresh} onRefresh={() => setRefresh((n) => n + 1)} /> : null}
          {ready && view === "customers" ? <Customers refresh={refresh} /> : null}
          {ready && view === "payouts" ? <Payouts refresh={refresh} /> : null}
          {ready && view === "shipping" ? <Shipping refresh={refresh} /> : null}
          {ready && view === "roles" ? <Roles refresh={refresh} /> : null}
          {ready ? <Overview refresh={refresh} /> : <p>Starting admin session…</p>}
        </main>
      </div>
    </div>
  );
}

function Approvals({ refresh, onRefresh }: { refresh: number; onRefresh: () => void }) {
  const [tab, setTab] = useState("pending");
  const { data, failed } = useResource(() => fetchListings(tab), [refresh, tab]);
  const [note, setNote] = useState<string | null>(null);

  async function decide(row: AdminListing, action: "approve" | "reject") {
    const result = await decideListing(row.listing_id, action);
    setNote(result ? `${row.listing_id} ${result.status}.` : `Could not ${action} ${row.listing_id}.`);
    onRefresh();
  }

  return (
    <section>
      <h1 className="eq-display text-3xl font-bold text-(--navy)">Listing approvals</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">
        Store creates status New. Approve publishes the listing; reject leaves it unpublished.
      </p>
      <div className="mt-4 flex gap-4 border-b border-(--line) text-[14px]">
        {["pending", "approved", "rejected"].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`pb-2 capitalize ${tab === id ? "border-b-2 border-(--amber) font-semibold" : "text-(--ink-soft)"}`}
          >
            {id}
          </button>
        ))}
      </div>
      {failed ? <Notice>Could not load listings.</Notice> : null}
      <table className="mt-4 w-full text-left text-[13px]">
        <thead>
          <tr className="text-(--ink-soft)">
            <th className="pb-2 font-medium">Equipment</th>
            <th className="pb-2 font-medium">Store</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Submitted</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {(data?.listings ?? []).map((row) => (
            <tr key={row.listing_id} className="border-t border-(--line)">
              <td className="py-3">
                <div className="font-semibold">{row.product.title}</div>
                <div className="text-[11px] text-(--ink-soft)">{row.category ?? row.product.category}</div>
              </td>
              <td className="py-3">
                {row.store}
                <div className="text-[11px] text-(--ink-soft)">{row.location}</div>
              </td>
              <td className="py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    row.type === "Sale" ? "bg-(--accent-soft) text-(--accent-ink)" : "bg-(--info)/10 text-(--info)"
                  }`}
                >
                  {row.type}
                </span>
              </td>
              <td className="py-3 text-(--ink-soft)">{row.submitted.replace("T", " ").slice(0, 16)}</td>
              <td className="py-3">
                {row.status === "pending" ? (
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary rounded-lg px-3 py-1.5" onClick={() => void decide(row, "approve")}>
                      Approve
                    </button>
                    <button type="button" className="rounded-lg border border-(--line) px-3 py-1.5" onClick={() => void decide(row, "reject")}>
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="capitalize text-(--ink-soft)">{row.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] text-(--ink-soft)">Showing {data?.listings.length ?? 0} of {data?.total ?? 0} {tab} listings</p>
      {note ? <Notice>{note}</Notice> : null}
    </section>
  );
}

function Dashboard({ refresh, onOpenListings }: { refresh: number; onOpenListings: () => void }) {
  const { data } = useResource(fetchOverview, [refresh]);
  return (
    <section>
      <h1 className="eq-display text-3xl font-bold text-(--navy)">Dashboard</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">
        BTIC super admin. Approve listings, view stores and haulage agents. Do not pay them from here.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={onOpenListings} className="rounded-2xl border border-(--line) bg-white p-4 text-left">
          <div className="text-[12px] text-(--ink-soft)">Pending listings</div>
          <div className="eq-display text-4xl font-bold text-(--navy)">{data?.pending_listings ?? "—"}</div>
          <div className="text-[12px] text-(--amber)">Open approvals</div>
        </button>
        <div className="rounded-2xl border border-(--line) bg-white p-4">
          <div className="text-[12px] text-(--ink-soft)">Haulage reviews</div>
          <div className="eq-display text-4xl font-bold text-(--navy)">{data?.haulage_reviews ?? "—"}</div>
          <div className="text-[12px] text-(--ink-soft)">Yard queue</div>
        </div>
        <div className="rounded-2xl border border-(--line) bg-white p-4">
          <div className="text-[12px] text-(--ink-soft)">Agent payouts held</div>
          <div className="eq-display text-4xl font-bold text-(--navy)">{data?.payouts_held ?? "—"}</div>
          <div className="text-[12px] text-(--ink-soft)">Visible only — not paid here</div>
        </div>
      </div>
    </section>
  );
}

function Overview({ refresh }: { refresh: number }) {
  const { data } = useResource(fetchOverview, [refresh]);
  const cards = [
    { label: "Pending listings", value: data?.pending_listings ?? "—", detail: "Require review" },
    { label: "Haulage reviews", value: data?.haulage_reviews ?? "—", detail: "Awaiting approval" },
    { label: "Agent payouts held", value: data?.payouts_held ?? "—", detail: "Require attention" },
  ];
  return (
    <aside className="flex flex-col gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-(--line) bg-white p-4">
          <div className="text-[12px] text-(--ink-soft)">{card.label}</div>
          <div className="eq-display text-4xl font-bold text-(--navy)">{card.value}</div>
          <div className="text-[12px] text-(--ink-soft)">{card.detail}</div>
        </div>
      ))}
    </aside>
  );
}

function Stores({ refresh }: { refresh: number }) {
  const { data } = useResource(fetchStores, [refresh]);
  return (
    <section>
      <h1 className="eq-display text-3xl font-bold">Stores</h1>
      <ul className="mt-4 space-y-2">
        {(data?.stores ?? []).map((store) => (
          <li key={store.store_id} className="rounded-xl border border-(--line) bg-white p-4">
            <div className="font-semibold">{store.name}</div>
            <div className="text-[13px] text-(--ink-soft)">{store.location} · {store.status}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Agents({ refresh }: { refresh: number }) {
  const { data } = useResource(fetchAgents, [refresh]);
  return (
    <section>
      <h1 className="eq-display text-3xl font-bold">Agents</h1>
      <p className="mt-1 text-[13px] text-(--ink-soft)">
        Haulage agents (packing yard, transport). The admin host attaches them to a hire. It does not pay them.
      </p>
      <ul className="mt-4 space-y-2">
        {(data?.agents ?? []).map((agent) => (
          <li key={agent.agent_id} className="rounded-xl border border-(--line) bg-white p-4">
            <div className="font-semibold">{agent.name}</div>
            <div className="text-[13px] text-(--ink-soft)">
              {agent.role ?? "haulage"} · {agent.packing_yard ?? agent.region} · {agent.transport_means ?? "lowbed"}
            </div>
            <div className="text-[12px] text-(--ink-faint)">{agent.stores.join(", ")}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HaulageDesk({ refresh, onRefresh }: { refresh: number; onRefresh: () => void }) {
  const { data, failed } = useResource(fetchHaulageDesk, [refresh]);
  const [note, setNote] = useState<string | null>(null);
  const agents = data?.agents ?? [];
  const firstAgent = agents[0]?.agent_id ?? "AG-11";

  async function attach(hireId: string) {
    const result = await attachHireAgent(hireId, firstAgent);
    setNote(result ? `${hireId} attached to ${result.agent_id}.` : `Could not attach an agent to ${hireId}.`);
    onRefresh();
  }

  return (
    <section>
      <h1 className="eq-display text-3xl font-bold">Haulage desk</h1>
      <p className="mt-1 text-[13px] text-(--ink-soft)">
        {data?.note ?? "Assigned orders for haulage agents. Paying shipping is refused here."}
      </p>
      {failed ? <Notice>Could not load the haulage desk.</Notice> : null}
      <h2 className="mt-4 text-[14px] font-semibold">In review</h2>
      <ul className="mt-2 space-y-2">
        {(data?.queue ?? []).map((row) => (
          <li key={row.hire_id} className="flex items-center justify-between gap-3 rounded-xl border border-(--line) bg-white p-4">
            <div>
              <div className="font-semibold">{row.hire_id}</div>
              <div className="text-[13px] text-(--ink-soft)">
                {row.title ?? "Hire"} · {row.site ?? "site"} · {row.agent_id ?? "unassigned"}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary rounded-lg px-3 py-1.5 text-[13px]" onClick={() => void attach(row.hire_id)}>
                Attach agent
              </button>
              <button
                type="button"
                className="rounded-lg border border-(--line) px-3 py-1.5 text-[13px]"
                onClick={() => void tryPayShipping(row.hire_id).then(setNote)}
              >
                Pay shipping
              </button>
            </div>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 text-[14px] font-semibold">Assigned</h2>
      <ul className="mt-2 space-y-2">
        {(data?.assigned ?? []).map((row) => (
          <li key={row.hire_id} className="rounded-xl border border-(--line) bg-white p-4">
            <div className="font-semibold">{row.hire_id} · {row.agent_id}</div>
            <div className="text-[13px] text-(--ink-soft)">{row.title} · shipping {row.shipping_amount ?? row.quote} UGX</div>
          </li>
        ))}
        {(data?.assigned ?? []).length === 0 ? (
          <li className="text-[13px] text-(--ink-soft)">No agent attached yet.</li>
        ) : null}
      </ul>
      {note ? <Notice>{note}</Notice> : null}
    </section>
  );
}

function Customers({ refresh }: { refresh: number }) {
  const { data } = useResource(fetchCustomers, [refresh]);
  return (
    <section>
      <h1 className="eq-display text-3xl font-bold">Customers</h1>
      <ul className="mt-4 space-y-2">
        {(data?.customers ?? []).map((customer) => (
          <li key={customer.user_id} className="rounded-xl border border-(--line) bg-white p-4">
            <div className="font-semibold">{customer.name}</div>
            <div className="text-[13px] text-(--ink-soft)">{customer.company} · {customer.location}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Payouts({ refresh }: { refresh: number }) {
  const { data } = useResource(fetchPayouts, [refresh]);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section>
      <h1 className="eq-display text-3xl font-bold">Payouts</h1>
      <p className="mt-1 text-[13px] text-(--ink-soft)">{data?.note ?? "Visible only. This host does not move money."}</p>
      <ul className="mt-4 space-y-2">
        {(data?.payouts ?? []).map((payout) => (
          <li key={payout.payout_id} className="flex items-center justify-between rounded-xl border border-(--line) bg-white p-4">
            <div>
              <div className="font-semibold">{payout.payout_id} · {payout.store_id}</div>
              <div className="text-[13px] text-(--amber)">{money(payout.amount)} · {payout.status}</div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-(--line) px-3 py-1.5 text-[13px]"
              onClick={() => void tryPayPayout(payout.payout_id).then(setMessage)}
            >
              Attempt pay
            </button>
          </li>
        ))}
      </ul>
      {message ? <Notice>{message}</Notice> : null}
    </section>
  );
}

function Shipping({ refresh }: { refresh: number }) {
  const { data } = useResource(fetchShipping, [refresh]);
  return (
    <section>
      <h1 className="eq-display text-3xl font-bold">Shipping</h1>
      <table className="mt-4 w-full text-left text-[13px]">
        <thead>
          <tr className="text-(--ink-soft)">
            <th className="pb-2">Lane</th>
            <th className="pb-2">Km</th>
            <th className="pb-2">Typical quote</th>
          </tr>
        </thead>
        <tbody>
          {(data?.lanes ?? []).map((lane) => (
            <tr key={lane.lane_id} className="border-t border-(--line)">
              <td className="py-2">{lane.from} → {lane.to}</td>
              <td className="py-2">{lane.km}</td>
              <td className="py-2">{money(lane.typical_quote_ugx)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Roles({ refresh }: { refresh: number }) {
  const { data } = useResource(fetchRoles, [refresh]);
  return (
    <section>
      <h1 className="eq-display text-3xl font-bold">Roles</h1>
      <ul className="mt-4 space-y-2">
        {(data?.roles ?? []).map((role) => (
          <li key={role.role} className="rounded-xl border border-(--line) bg-white p-4">
            <div className="font-semibold capitalize">{role.role.replaceAll("_", " ")}</div>
            <div className="text-[13px] text-(--ink-soft)">{role.description}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
