// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Greeting, type Starter, Starters } from "web-shared";
import { formatUgx, rateSuffix } from "@/lib/format";
import type { Product } from "@/lib/types";
import MachineCard from "../MachineCard";

const STARTERS: Starter[] = [
  { icon: "search", prompt: "Need a 20-ton excavator in Mukono for 10 days, include transport to site." },
  { icon: "truck", prompt: "The Entebbe dump truck — is it free this week?" },
  { icon: "tag", prompt: "I need hydraulic hoses for an ACME Iron excavator." },
];

export default function HomeView({
  name,
  machines,
  onAsk,
  onPick,
}: {
  name: string;
  machines: Product[];
  onAsk: (text: string) => void;
  onPick?: (product: Product) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Greeting
        title={
          <h1 className="eq-hero">
            Hire the machine. <em className="not-italic text-(--navy)">Skip the runaround.</em>
          </h1>
        }
      >
        Tell the agent what you need on site. Location, dates, haulage included. Signed in as {name}.
      </Greeting>
      <form
        className="flex gap-2 rounded-2xl border border-(--line) bg-white p-2 shadow-(--shadow-sm)"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const query = String(data.get("q") || "").trim();
          if (query) onAsk(query);
        }}
      >
        <input
          name="q"
          defaultValue="20-ton excavator in Mukono for 10 days"
          className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-[15px] outline-none"
          placeholder="20-ton excavator in Mukono for 10 days"
        />
        <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm font-bold">
          Search
        </button>
      </form>
      <Starters items={STARTERS} />
      <div className="flex gap-3 overflow-x-auto pb-1">
        {machines.slice(0, 6).map((product) => (
          <MachineCard
            key={product.product_id}
            product={product}
            onSelect={() => onPick?.(product)}
          />
        ))}
      </div>
      <p className="text-[12px] text-(--ink-soft)">
        Daily rates from {machines[0] ? `${formatUgx(machines[0].price, true)}${rateSuffix("Daily")}` : "the yard"}. Weekly and monthly
        apply as whole periods.
      </p>
    </div>
  );
}
