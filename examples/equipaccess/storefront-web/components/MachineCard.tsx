// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { formatUgx, isHireListing, productGlyph, rateSuffix } from "@/lib/format";
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
  layout = "rail",
  onSelect,
  onRate,
}: {
  product: Product;
  reason?: string | null;
  selected?: boolean;
  layout?: "rail" | "grid";
  onSelect?: () => void;
  onRate?: (rate: string) => void;
}) {
  const attrs = product.attributes ?? {};
  const hire = isHireListing(product);
  const rate = attrs.rate_type ?? "Daily";
  const onHire = (product.labels ?? []).includes("On hire") || attrs.units_left_for_dates === "0";
  const daily = Number(attrs.daily_rate ?? product.price);
  const saleOut = !hire && product.in_stock === false;
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-(--shadow-sm) ${
        layout === "rail" ? "w-[240px] shrink-0" : "min-w-0 w-full"
      } ${selected ? "border-(--amber) ring-2 ring-(--amber)" : "border-(--line)"} ${
        onSelect ? "cursor-pointer" : ""
      }`}
      onClick={onSelect}
    >
      <MachineMark product={product} className="h-32 text-3xl" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug text-(--navy)">{product.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              hire ? "bg-(--accent-soft) text-(--accent-ink)" : "bg-(--navy) text-(--amber)"
            }`}
          >
            {hire ? "Hire" : "Buy"}
          </span>
          {hire ? (
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                onHire ? "bg-(--accent-soft) text-(--accent-ink)" : "bg-(--ok-soft) text-(--ok)"
              }`}
            >
              {onHire ? "On hire" : "In stock"}
            </span>
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                saleOut ? "bg-(--warn-soft) text-(--warn)" : "bg-(--ok-soft) text-(--ok)"
              }`}
            >
              {saleOut ? "Ask to buy" : "In stock"}
            </span>
          )}
          <span className="font-semibold text-(--amber)">
            {hire
              ? `${formatUgx(Number(attrs.quoted_total ?? daily), true)} ${attrs.quoted_total ? "" : rateSuffix(rate)}`
              : formatUgx(product.price)}
          </span>
        </div>
        <div className="text-[12px] text-(--ink-soft)">{attrs.location ?? "Uganda"}</div>
        {reason ? <p className="text-[12px] text-(--ink-2)">{reason}</p> : null}
        {hire ? (
          <div className="mt-auto flex gap-1">
            {(["Daily", "Weekly", "Monthly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRate?.(option);
                }}
                className={`flex-1 rounded-md border px-1.5 py-1 text-[11px] font-semibold ${
                  rate === option ? "border-(--amber) bg-(--amber) text-(--navy)" : "border-(--line) bg-white text-(--navy)"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-auto text-[12px] font-semibold text-(--navy)">Sale price</p>
        )}
        {onSelect ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className="btn-primary mt-1 rounded-lg py-1.5 text-[13px] font-bold"
          >
            Select
          </button>
        ) : null}
      </div>
    </article>
  );
}
