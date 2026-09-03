// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { formatUgx, productGlyph, rateSuffix } from "@/lib/format";
import type { Product } from "@/lib/types";

export function MachineMark({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <div
      className={`grid place-items-center bg-(--navy) font-bold tracking-wide text-(--amber) ${className}`}
      aria-hidden
    >
      {productGlyph(product)}
    </div>
  );
}

export default function MachineCard({
  product,
  reason,
  selected,
  onSelect,
  onRate,
}: {
  product: Product;
  reason?: string | null;
  selected?: boolean;
  onSelect?: () => void;
  onRate?: (rate: string) => void;
}) {
  const attrs = product.attributes ?? {};
  const rate = attrs.rate_type ?? "Daily";
  const onHire = (product.labels ?? []).includes("On hire") || attrs.units_left_for_dates === "0";
  const daily = Number(attrs.daily_rate ?? product.price);
  return (
    <article
      className={`flex w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-(--shadow-sm) ${
        selected ? "border-(--amber) ring-2 ring-(--amber)" : "border-(--line)"
      }`}
    >
      <MachineMark product={product} className="h-32 text-3xl" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug text-(--navy)">{product.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              onHire ? "bg-(--accent-soft) text-(--accent-ink)" : "bg-(--ok-soft) text-(--ok)"
            }`}
          >
            {onHire ? "On hire" : "In stock"}
          </span>
          <span className="font-semibold text-(--amber)">
            {formatUgx(Number(attrs.quoted_total ?? daily), true)} {attrs.quoted_total ? "" : rateSuffix(rate)}
          </span>
        </div>
        <div className="text-[12px] text-(--ink-soft)">{attrs.location ?? "Uganda"}</div>
        {reason ? <p className="text-[12px] text-(--ink-2)">{reason}</p> : null}
        <div className="mt-auto flex gap-1">
          {(["Daily", "Weekly", "Monthly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRate?.(option)}
              className={`flex-1 rounded-md border px-1.5 py-1 text-[11px] font-semibold ${
                rate === option ? "border-(--amber) bg-(--amber) text-(--navy)" : "border-(--line) bg-white text-(--navy)"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {onSelect ? (
          <button type="button" onClick={onSelect} className="btn-primary mt-1 rounded-lg py-1.5 text-[13px] font-bold">
            Select
          </button>
        ) : null}
      </div>
    </article>
  );
}
