// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { type Order, ORDER_NOUNS } from "web-shared";
import { productGlyph } from "./format";

export const NOUNS = { ...ORDER_NOUNS, singular: "hire", plural: "hires" };

export function OrderThumb({ order }: { order: Order }) {
  const title = order.items[0]?.title ?? order.order_id;
  return (
    <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[9px] bg-(--navy) text-[11px] font-bold text-(--amber)">
      {productGlyph({ title })}
    </div>
  );
}
