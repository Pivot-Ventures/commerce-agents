// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Greeting, type Starter, Starters } from "web-shared";

const STARTERS: Starter[] = [
  { icon: "search", prompt: "Need a 20-ton excavator in Mukono for 10 days, include transport to site." },
  { icon: "truck", prompt: "The Entebbe dump truck — is it free this week?" },
  { icon: "tag", prompt: "I need hydraulic hoses for an ACME Iron excavator." },
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
            Hire assistant. <em className="not-italic text-(--navy)">Tell it the site.</em>
          </h1>
        }
      >
        Location, dates, haulage included. The shop listing is on Shop. Signed in as {name}.
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
          placeholder="Machine, location, and dates"
        />
        <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm font-bold">
          Search
        </button>
      </form>
      <Starters items={STARTERS} />
    </div>
  );
}
