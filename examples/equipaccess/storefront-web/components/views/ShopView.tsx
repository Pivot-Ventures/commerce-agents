// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useMemo, useState } from "react";
import { type ShopChip, chipProducts, sectionCounts } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import MachineCard from "../MachineCard";

const CHIPS: { id: ShopChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rent", label: "Rentals" },
  { id: "sale", label: "For sale" },
  { id: "spare", label: "Spares" },
  { id: "material", label: "Materials" },
  { id: "web", label: "Web" },
];

const MATERIAL_GROUPS = [
  { id: "all", label: "All materials" },
  { id: "cement", label: "Cement" },
  { id: "steel", label: "Steel" },
  { id: "iron-sheets", label: "Iron sheets" },
  { id: "blocks", label: "Blocks" },
  { id: "aggregates", label: "Aggregates" },
];

const WEB_SOURCES = [
  { id: "all", label: "All sources" },
  { id: "yard", label: "EquipAccess yard" },
  { id: "jiji", label: "Jiji.ug" },
  { id: "mantrac", label: "Mantrac" },
  { id: "lexa", label: "Lexa" },
  { id: "clone", label: "Clone Supplies" },
  { id: "heavyequipmentuganda", label: "Heavy Equipment Uganda" },
];

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
  const [query, setQuery] = useState("");
  const [materialGroup, setMaterialGroup] = useState("all");
  const [webSource, setWebSource] = useState("all");
  const counts = useMemo(() => sectionCounts(products ?? []), [products]);
  const filtered = useMemo(() => {
    let rows = chipProducts(products ?? [], chip, chip === "web" ? query : "");
    if (chip === "material" && materialGroup !== "all") {
      rows = rows.filter((product) => (product.attributes?.material_group ?? product.attributes?.machine_class) === materialGroup);
    }
    if (chip === "web" && webSource !== "all") {
      rows = rows.filter((product) => (product.attributes?.source ?? "yard") === webSource);
    }
    return rows;
  }, [products, chip, query, materialGroup, webSource]);

  const heading =
    chip === "all"
      ? "All products"
      : chip === "rent"
        ? "Rentals"
        : chip === "sale"
          ? "For sale"
          : chip === "spare"
            ? "Spares"
            : chip === "material"
              ? "Materials + spares"
              : "Web finds";

  return (
    <div className="panel-scroll h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((item) => (
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
            <span className="rounded-full bg-(--well) px-2.5 py-1 font-semibold text-(--navy)">Rentals {counts.rent}</span>
            <span className="rounded-full bg-(--well) px-2.5 py-1 font-semibold text-(--navy)">Sale {counts.sale}</span>
            <span className="rounded-full bg-(--well) px-2.5 py-1 font-semibold text-(--navy)">Spares {counts.spare}</span>
            <span className="rounded-full bg-(--well) px-2.5 py-1 font-semibold text-(--navy)">Materials {counts.material}</span>
          </div>
        </div>

        {chip === "web" ? (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setQuery(String(data.get("q") || ""));
            }}
          >
            <input
              name="q"
              defaultValue={query}
              placeholder="20-ton excavator Mukono"
              className="min-w-0 flex-1 rounded-xl border border-(--line) bg-white px-3 py-2 text-[15px] outline-none"
            />
            <button type="submit" className="rounded-xl bg-(--navy) px-4 py-2 text-sm font-bold text-white">
              Search
            </button>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${query || "construction equipment"} Uganda hire`)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-(--line) px-4 py-2 text-sm font-semibold text-(--navy)"
            >
              Search the web
            </a>
          </form>
        ) : null}

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

        {chip === "web" ? (
          <div className="flex flex-wrap gap-2">
            {WEB_SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setWebSource(source.id)}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                  webSource === source.id
                    ? "border-(--amber) bg-(--amber) text-(--navy)"
                    : "border-(--line) bg-white"
                }`}
              >
                {source.label}
              </button>
            ))}
          </div>
        ) : null}

        <div>
          <h1 className="eq-hero">{heading}</h1>
          <p className="text-(--ink-soft)">
            {chip === "web"
              ? "Yard items check out here. Web finds open on the source."
              : chip === "material"
                ? "Construction materials and spares from the yard. Public market figures are labelled."
                : "Every hire machine, used sale, spare, and bag on the yard. Public figures are labelled and are not EquipAccess quotes."}
          </p>
        </div>

        {products == null ? (
          <p className="text-[14px] text-(--ink-soft)">Loading the yard catalog…</p>
        ) : filtered.length === 0 ? (
          <p className="text-[14px] text-(--ink-soft)">No listings in this catalog.</p>
        ) : chip === "web" ? (
          <div className="flex flex-col gap-3">
            {filtered.map((product) => (
              <MachineCard
                key={product.product_id}
                product={product}
                layout="row"
                selected={picked?.product_id === product.product_id}
                onSelect={() => onPick(product)}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((product) => (
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
        )}

        <p className="text-[12px] text-(--ink-soft)">
          {chip === "web"
            ? "Yard items check out here. Web finds open on the source."
            : "Rates are indicative. Final hire cost shown in live summary."}
        </p>
      </div>
    </div>
  );
}
