// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import type { ReactNode } from "react";
import { ActivityLine, type AgentTurn, type AssistantChatItem, Chat as ChatShell } from "web-shared";
import type { Product } from "@/lib/types";
import GenerativeBlock from "./generative";

function Pending({ item }: { item: AssistantChatItem }) {
  const searching = item.tools.includes("search_products") && !item.segments.some((s) => s.type === "ui");
  if (!searching) return <ActivityLine item={item} />;
  return (
    <section role="status" className="rounded-2xl border border-(--line) bg-white p-3">
      <div className="mb-3 animate-pulse text-[15px] text-(--ink-soft)">{item.activity ?? "Checking machines…"}</div>
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-[180px] w-48 shrink-0 rounded-xl bg-(--well)" />
        ))}
      </div>
    </section>
  );
}

export default function Chat({
  chat,
  home,
  onPick,
}: {
  chat: AgentTurn;
  home: ReactNode;
  onPick?: (product: Product) => void;
}) {
  return (
    <ChatShell
      chat={chat}
      home={home}
      wide={new Set(["products", "comparison"])}
      renderPending={(item) => <Pending item={item} />}
      renderBlock={(segment) => (
        <GenerativeBlock block={segment.block} status={segment.status} onPick={onPick} />
      )}
    />
  );
}
