// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Greeting, type Starter, Starters } from "web-shared";

const STARTERS: Starter[] = [
  { icon: "search", prompt: "Need a 20-ton excavator in Mukono for 10 days, include transport to site." },
  { icon: "tag", prompt: "Show used generators for sale on the yard." },
  { icon: "box", prompt: "I need hydraulic hoses for a 20-ton excavator." },
  { icon: "inbox", prompt: "200 bags of cement for a site in Ntinda." },
];

export default function HomeView({
  name,
  onAsk,
}: {
  name: string;
  onAsk: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Greeting
        title={
          <h1 className="eq-hero">
            Shop assistant. <em className="not-italic text-(--navy)">Rent or buy.</em>
          </h1>
        }
      >
        Four catalogs on Shop: rental, sale of equipment, sale of spares, and sale of construction
        materials. Hire questions need site and dates. Signed in as {name}.
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
          className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-[15px] outline-none"
          placeholder="Machine, spare, materials — or hire dates and site"
        />
        <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm font-bold">
          Search
        </button>
      </form>
      <Starters items={STARTERS} />
    </div>
  );
}
