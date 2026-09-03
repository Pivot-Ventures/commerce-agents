// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useMemo, useState } from "react";
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
  | "stores"
  | "agents"
  | "listings"
  | "desk"
  | "customers"
  | "payouts"
  | "shipping"
  | "roles";

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "stores", label: "Stores", icon: "store" },
  { id: "agents", label: "Agents", icon: "truck" },
  { id: "listings", label: "Listing approvals", icon: "list" },
  { id: "desk", label: "Haulage desk", icon: "pin" },
  { id: "customers", label: "Customers", icon: "people" },
  { id: "payouts", label: "Payouts", icon: "wallet" },
  { id: "shipping", label: "Shipping", icon: "route" },
  { id: "roles", label: "Roles", icon: "key" },
];

const PAGE_SIZE = 3;

function money(value: number) {
  return `${Math.round(value).toLocaleString("en-UG")} UGX`;
}

function storeInitial(store: string) {
  const rest = store.replace(/^ACME\s+/i, "").trim();
  const words = rest.split(/\s+/);
  return (words[words.length - 1] || store).slice(0, 1).toUpperCase();
}

function machineMark(title: string) {
  const hay = title.toLowerCase();
  if (hay.includes("excavator")) return "EX";
  if (hay.includes("loader") || hay.includes("skid")) return "WL";
  if (hay.includes("dump") || hay.includes("truck") || hay.includes("bowser")) return "DT";
  if (hay.includes("generator") || hay.includes("tower")) return "GN";
  if (hay.includes("scaffold") || hay.includes("scissor") || hay.includes("access")) return "AC";
  if (hay.includes("roller") || hay.includes("compactor") || hay.includes("plate")) return "PK";
  if (hay.includes("pump") || hay.includes("mix") || hay.includes("timber")) return "MX";
  if (hay.includes("breaker")) return "BK";
  return "AE";
}

function NavIcon({ name }: { name: string }) {
  const d: Record<string, string> = {
    home: "M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    store: "M4 8 6 4h12l2 4v12H4zm0 0h16M9 12h6",
    truck: "M3 7h11v8H3zm11 3h4l3 3v2h-7M6 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
    list: "M5 7h14M5 12h14M5 17h10",
    pin: "M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
    people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6m7.5 1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M3 19c.6-3 3-5 6-5s5.4 2 6 5m3.5-4c2.2.4 3.8 2 4.3 4",
    wallet: "M4 7h16v12H4zm0 4h16M16 14.5h3",
    route: "M7 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4m10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4M8.2 9.2 15.8 14.8",
    key: "M8 14a4 4 0 1 0 3.5-6H20v3h-2v2h-2v2h-3.2A4 4 0 0 0 8 14m-1.2.2 1.4 1.4",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path d={d[name] ?? d.list} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminPage() {
  const session = useSession(api);
  const [view, setView] = useState<View>("listings");
  const [refresh, setRefresh] = useState(0);
  const ready = Boolean(session.sessionId);

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-[230px] shrink-0 flex-col bg-(--navy) px-4 py-5 text-[#e8eef6]">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="eq-display grid h-9 w-9 place-items-center rounded-[10px] bg-white text-[18px] font-bold text-(--navy)"
          >
            E<span className="text-(--amber)">.</span>
          </span>
          <div>
            <div className="eq-display text-[20px] font-bold tracking-wide text-white">EquipAccess</div>
            <div className="text-[11px] text-[#9aa8b8]">Admin portal</div>
          </div>
        </div>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Admin views">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] ${
                view === item.id ? "bg-[#f5a62322] font-semibold text-(--amber)" : "text-[#d5dce4]"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between text-[11px] text-[#9aa8b8]">
          <div>
            © 2026 EquipAccess Uganda
            <div>All rights reserved</div>
          </div>
          <span aria-label="Uganda" title="Uganda" className="text-[16px]">
            🇺🇬
          </span>
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
  const [typeFilter, setTypeFilter] = useState<"all" | "Sale" | "Rent">("all");
  const [page, setPage] = useState(1);
  const { data, failed } = useResource(() => fetchListings(tab), [refresh, tab]);
  const [note, setNote] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const rows = data?.listings ?? [];
    return typeFilter === "all" ? rows : rows.filter((row) => row.type === typeFilter);
  }, [data, typeFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = filtered.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, filtered.length);

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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-(--line) text-[14px]">
        <div className="flex gap-4">
          {["pending", "approved", "rejected"].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setPage(1);
              }}
              className={`pb-2 capitalize ${tab === id ? "border-b-2 border-(--amber) font-semibold" : "text-(--ink-soft)"}`}
            >
              {id}
            </button>
          ))}
        </div>
        <label className="mb-1 flex items-center gap-2 text-[13px] text-(--ink-soft)">
          Filter
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as "all" | "Sale" | "Rent");
              setPage(1);
            }}
            className="rounded-lg border border-(--line) bg-white px-2 py-1 text-(--navy)"
            aria-label="Filter by listing type"
          >
            <option value="all">All types</option>
            <option value="Sale">Sale</option>
            <option value="Rent">Rent</option>
          </select>
        </label>
      </div>
      {failed ? <Notice>Could not load listings.</Notice> : null}
      <div className="mt-4 overflow-hidden rounded-2xl border border-(--line) bg-white shadow-(--shadow-sm)">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-(--ink-soft)">
              <th className="px-4 py-3 font-medium">Equipment</th>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.listing_id} className="border-t border-(--line)">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-(--navy) text-[11px] font-bold text-(--amber)">
                      {machineMark(row.product.title)}
                    </span>
                    <div>
                      <div className="font-semibold">{row.product.title}</div>
                      <div className="text-[11px] text-(--ink-soft)">{row.category ?? row.product.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-(--amber) text-[12px] font-bold text-(--navy)">
                      {storeInitial(row.store)}
                    </span>
                    <div>
                      <div>{row.store}</div>
                      <div className="text-[11px] text-(--ink-soft)">{row.location}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      row.type === "Sale" ? "bg-(--accent-soft) text-(--accent-ink)" : "bg-(--info)/10 text-(--info)"
                    }`}
                  >
                    {row.type === "Sale" ? "Sale" : "Rent"}
                  </span>
                </td>
                <td className="px-4 py-3 text-(--ink-soft)">{row.submitted.replace("T", " ").slice(0, 16)}</td>
                <td className="px-4 py-3">
                  {row.status === "pending" ? (
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary rounded-lg px-3 py-1.5" onClick={() => void decide(row, "approve")}>
                        Approve
                      </button>
                      <button type="button" className="rounded-lg border border-(--line) bg-white px-3 py-1.5" onClick={() => void decide(row, "reject")}>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--line) px-4 py-3 text-[12px] text-(--ink-soft)">
          <p>
            Showing {from} to {to} of {filtered.length} {tab} listings
          </p>
          <div className="flex gap-1">
            {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                className={`min-w-8 rounded-md px-2 py-1 ${
                  number === current ? "bg-(--amber) font-bold text-(--navy)" : "border border-(--line) bg-white"
                }`}
              >
                {number}
              </button>
            ))}
          </div>
        </div>
      </div>
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
    { label: "Pending listings", value: data?.pending_listings ?? "—", detail: "Require review", icon: "clock" },
    { label: "Haulage reviews", value: data?.haulage_reviews ?? "—", detail: "Awaiting approval", icon: "truck" },
    { label: "Agent payouts held", value: data?.payouts_held ?? "—", detail: "Require attention", icon: "wallet" },
  ];
  return (
    <aside className="flex flex-col gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-(--line) bg-white p-4">
          <div className="mb-2 text-(--amber)">
            <NavIcon name={card.icon === "clock" ? "list" : card.icon === "wallet" ? "wallet" : "truck"} />
          </div>
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
