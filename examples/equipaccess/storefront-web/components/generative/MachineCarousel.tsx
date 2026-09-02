// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { setHireWindow } from "@/lib/api";
import type { Product, ProductsPayload } from "@/lib/types";
import MachineCard from "../MachineCard";

export default function MachineCarousel({
  payload,
  onPick,
}: {
  payload: ProductsPayload;
  onPick?: (product: Product) => void;
}) {
  return (
    <section className="rounded-2xl border border-(--line) bg-white p-3 shadow-(--shadow-sm)">
      {payload.title ? <h3 className="mb-2 px-1 text-[15px] font-bold text-(--navy)">{payload.title}</h3> : null}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {payload.items.map((item, index) => (
          <MachineCard
            key={item.product.product_id}
            product={item.product}
            reason={item.reason}
            selected={index === 0}
            onSelect={onPick ? () => onPick(item.product) : undefined}
            onRate={(rate) => void setHireWindow({ rate_type: rate })}
          />
        ))}
      </div>
    </section>
  );
}
