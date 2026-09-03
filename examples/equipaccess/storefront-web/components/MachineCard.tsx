// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import {
  badgeLabel,
  formatListPrice,
  isHireListing,
  isWebFind,
  listingKind,
  productGlyph,
  sourceLabel,
} from "@/lib/format";
import type { Product } from "@/lib/types";

export function MachineMark({ product, className = "" }: { product: Product; className?: string }) {
  const src = product.image_url;
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-(--well) ${className}`}>
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`grid place-items-center bg-(--navy) font-bold tracking-wide text-(--amber) ${className}`}
      aria-hidden
    >
      {productGlyph(product)}
    </div>
  );
}

function Badge({ product }: { product: Product }) {
  const kind = listingKind(product);
  const tone =
    kind === "Rent"
      ? "bg-[#5c6b7a] text-white"
      : kind === "Sale"
        ? "bg-(--navy) text-(--amber)"
        : kind === "Spare"
          ? "bg-[#1f4d3a] text-white"
          : "bg-[#c4a574] text-(--navy)";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${tone}`}>
      {badgeLabel(kind)}
    </span>
  );
}

export default function MachineCard({
  product,
  reason,
  selected,
  layout = "rail",
  quantity,
  onSelect,
  onRate,
  onQuantity,
}: {
  product: Product;
  reason?: string | null;
  selected?: boolean;
  layout?: "rail" | "grid" | "row";
  quantity?: number;
  onSelect?: () => void;
  onRate?: (rate: string) => void;
  onQuantity?: (quantity: number) => void;
}) {
  const attrs = product.attributes ?? {};
  const hire = isHireListing(product);
  const kind = listingKind(product);
  const web = isWebFind(product);
  const onHire = (product.labels ?? []).includes("On hire") || attrs.units_left_for_dates === "0";
  const saleOut = !hire && product.in_stock === false;
  const showQty = selected && (kind === "Material" || kind === "Spare") && !web && onQuantity;

  if (layout === "row") {
    return (
      <article
        className={`flex gap-3 overflow-hidden rounded-2xl border bg-white p-3 shadow-(--shadow-sm) ${
          selected ? "border-(--amber) ring-2 ring-(--amber)" : "border-(--line)"
        } ${onSelect ? "cursor-pointer" : ""}`}
        onClick={onSelect}
      >
        <MachineMark product={product} className="h-20 w-24 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge product={product} />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                web ? "bg-(--ok-soft) text-(--ok)" : "bg-(--accent-soft) text-(--accent-ink)"
              }`}
            >
              {sourceLabel(attrs.source ?? "yard").toUpperCase()}
            </span>
          </div>
          <h3 className="mt-1 text-[15px] font-bold leading-snug text-(--navy)">{product.title}</h3>
          <div className="text-[12px] text-(--ink-soft)">{attrs.location ?? "Uganda"}</div>
          <div className="mt-1 text-[13px] font-semibold text-(--amber)">{formatListPrice(product)}</div>
          {web ? (
            <p className="text-[12px] text-(--ink-soft)">Checkout stays on the source.</p>
          ) : (
            <p className="text-[12px] text-(--ink-soft)">On-platform checkout.</p>
          )}
        </div>
        {onSelect ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className={`self-center rounded-lg px-3 py-1.5 text-[13px] font-bold ${
              web ? "border border-(--navy) text-(--navy)" : "btn-primary"
            }`}
          >
            {web ? sourceLabel(attrs.source ?? "yard") : "Select"}
          </button>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-(--shadow-sm) ${
        layout === "rail" ? "w-[240px] shrink-0" : "min-w-0 w-full"
      } ${selected ? "border-(--amber) ring-2 ring-(--amber)" : "border-(--line)"} ${
        onSelect ? "cursor-pointer" : ""
      }`}
      onClick={onSelect}
    >
      <div className="relative">
        <MachineMark product={product} className="h-36 text-3xl" />
        <div className="absolute left-2 top-2">
          <Badge product={product} />
        </div>
        {selected ? (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-(--amber) text-[12px] font-bold text-(--navy)">
            ✓
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="text-[15px] font-bold leading-snug text-(--navy)">{product.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
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
          {web ? (
            <span className="rounded-full bg-(--info-soft) px-2 py-0.5 font-semibold text-(--info)">
              {sourceLabel(attrs.source ?? "yard")}
            </span>
          ) : null}
        </div>
        <div className="font-semibold text-(--amber)">{formatListPrice(product)}</div>
        <div className="text-[12px] text-(--ink-soft)">{attrs.location ?? "Uganda"}</div>
        {reason ? <p className="text-[12px] text-(--ink-2)">{reason}</p> : null}
        {showQty ? (
          <div className="mt-auto flex items-center gap-2">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-md border border-(--line)"
              onClick={(event) => {
                event.stopPropagation();
                onQuantity(Math.max(1, (quantity ?? 1) - 1));
              }}
            >
              −
            </button>
            <span className="min-w-[4ch] text-center text-[13px] font-bold text-(--navy)">
              {quantity ?? 1} {attrs.unit ?? "pcs"}
            </span>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-md border border-(--line)"
              onClick={(event) => {
                event.stopPropagation();
                onQuantity((quantity ?? 1) + 1);
              }}
            >
              +
            </button>
          </div>
        ) : hire && layout === "rail" && onRate ? (
          <div className="mt-auto flex gap-1">
            {(["Daily", "Weekly", "Monthly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRate(option);
                }}
                className={`flex-1 rounded-md border px-1.5 py-1 text-[11px] font-semibold ${
                  (attrs.rate_type ?? "Daily") === option
                    ? "border-(--amber) bg-(--amber) text-(--navy)"
                    : "border-(--line) bg-white text-(--navy)"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-auto text-[12px] font-semibold text-(--navy)">
            {web ? `Source: ${sourceLabel(attrs.source ?? "yard")}` : kind === "Rent" ? "Hire rate" : "Yard price"}
          </p>
        )}
        {onSelect && layout === "rail" ? (
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
