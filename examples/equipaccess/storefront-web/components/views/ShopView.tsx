// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useMemo, useState } from "react";
import { SHOP_SECTIONS, type ShopChip, chipProducts, sectionCounts } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import MachineCard from "../MachineCard";

const MATERIAL_GROUPS = [
  { id: "all", label: "All materials" },
  { id: "cement", label: "Cement" },
  { id: "steel", label: "Steel" },
  { id: "iron-sheets", label: "Iron sheets" },
  { id: "blocks", label: "Blocks" },
  { id: "aggregates", label: "Aggregates" },
];

function ProductGrid({
  products,
  picked,
  quantity,
  onPick,
  onQuantity,
}: {
  products: Product[];
  picked: Product | null;
  quantity: number;
  onPick: (product: Product) => void;
  onQuantity: (quantity: number) => void;
}) {
  return (
    <div className="eq-product-grid">
      {products.map((product) => (
        <MachineCard
          key={product.product_id}
          product={product}
          layout="grid"
          selected={picked?.product_id === product.product_id}
          quantity={picked?.product_id === product.product_id ? quantity : undefined}
          onSelect={() => onPick(product)}
          onQuantity={picked?.product_id === product.product_id ? onQuantity : undefined}
        />
      ))}
    </div>
  );
}

export default function ShopView({
  products,
  chip,
  onChip,
  picked,
  quantity,
  onPick,
  onQuantity,
}: {
  products: Product[] | null;
  chip: ShopChip;
  onChip: (chip: ShopChip) => void;
  picked: Product | null;
  quantity: number;
  onPick: (product: Product) => void;
  onQuantity: (quantity: number) => void;
}) {
  const [materialGroup, setMaterialGroup] = useState("all");
  const counts = useMemo(() => sectionCounts(products ?? []), [products]);
  const filtered = useMemo(() => {
    let rows = chipProducts(products ?? [], chip);
    if (chip === "material" && materialGroup !== "all") {
      rows = rows.filter((product) => (product.attributes?.material_group ?? product.attributes?.machine_class) === materialGroup);
    }
    return rows;
  }, [products, chip, materialGroup]);

  const section = SHOP_SECTIONS.find((item) => item.id === chip);
  const heading = chip === "all" ? "Shop" : (section?.label ?? "Shop");
  const blurb =
    chip === "all"
      ? "Four catalogs: rental, sale of equipment, sale of spares, and sale of construction materials. Yard stock checks out here. Web-sourced rows open on the source."
      : (section?.blurb ?? "");

  return (
    <div className="panel-scroll h-full overflow-y-auto">
      <div className="mx-auto flex w-full flex-col gap-4 px-3 pb-10 pt-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onChip("all")}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                chip === "all"
                  ? "border-(--amber) bg-(--amber) text-(--navy)"
                  : "border-(--line) bg-white text-(--navy)"
              }`}
            >
              All
            </button>
            {SHOP_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChip(item.id)}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                  chip === item.id
                    ? "border-(--amber) bg-(--amber) text-(--navy)"
                    : "border-(--line) bg-white text-(--navy)"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-[12px]">
            {SHOP_SECTIONS.map((item) => (
              <span key={item.id} className="rounded-full bg-(--well) px-2.5 py-1 font-semibold text-(--navy)">
                {item.nav} {counts[item.id]}
              </span>
            ))}
          </div>
        </div>

        {chip === "material" ? (
          <div className="flex flex-wrap gap-2">
            {MATERIAL_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setMaterialGroup(group.id)}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                  materialGroup === group.id
                    ? "border-(--amber) bg-(--amber) text-(--navy)"
                    : "border-(--line) bg-white"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        ) : null}

        <div>
          <h1 className="eq-display text-[30px] font-bold leading-none text-(--navy) sm:text-[36px]">{heading}</h1>
          <p className="mt-1 text-[14px] text-(--ink-soft)">{blurb}</p>
        </div>

        {products == null ? (
          <p className="text-[14px] text-(--ink-soft)">Loading the yard catalog…</p>
        ) : chip === "all" ? (
          <div className="flex flex-col gap-8">
            {SHOP_SECTIONS.map((item) => {
              const rows = chipProducts(products, item.id);
              return (
                <section key={item.id}>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="eq-display text-[22px] font-bold text-(--navy)">{item.label}</h2>
                      <p className="text-[13px] text-(--ink-soft)">{item.blurb}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChip(item.id)}
                      className="text-[13px] font-semibold text-(--navy) underline-offset-2 hover:underline"
                    >
                      See all {counts[item.id]}
                    </button>
                  </div>
                  {rows.length === 0 ? (
                    <p className="text-[14px] text-(--ink-soft)">No listings in this catalog.</p>
                  ) : (
                    <ProductGrid
                      products={rows}
                      picked={picked}
                      quantity={quantity}
                      onPick={onPick}
                      onQuantity={onQuantity}
                    />
                  )}
                </section>
              );
            })}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[14px] text-(--ink-soft)">No listings in this catalog.</p>
        ) : (
          <ProductGrid
            products={filtered}
            picked={picked}
            quantity={quantity}
            onPick={onPick}
            onQuantity={onQuantity}
          />
        )}

        <p className="text-[12px] text-(--ink-soft)">
          {chip === "rent"
            ? "Hire rates are indicative. Final hire cost is in the live summary."
            : "Yard sale, spare, and material rows use EquipAccess purchase checkout. Web-sourced rows stay on the source."}
        </p>
      </div>
    </div>
  );
}
