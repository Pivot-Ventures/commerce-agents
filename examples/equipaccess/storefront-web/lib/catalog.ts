// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { listingKind } from "./format";
import type { Product } from "./types";

export type ShopChip = "all" | "rent" | "sale" | "spare" | "material";

export const SHOP_SECTIONS: {
  id: Exclude<ShopChip, "all">;
  label: string;
  nav: string;
  blurb: string;
}[] = [
  {
    id: "rent",
    label: "Rental",
    nav: "Rental",
    blurb: "Equipment hire from the yard. Dates, rate type, and haulage apply here.",
  },
  {
    id: "sale",
    label: "Sale of equipment",
    nav: "Sale",
    blurb: "Used machines for purchase. Yard stock checks out as a sale, not a hire.",
  },
  {
    id: "spare",
    label: "Sale of spares",
    nav: "Spares",
    blurb: "Parts and kits from the yard. Buy, not hire.",
  },
  {
    id: "material",
    label: "Sale of construction materials",
    nav: "Materials",
    blurb: "Cement, steel, sheets, blocks, and aggregates. Buy by the unit.",
  },
];

export function matchesChip(product: Product, chip: ShopChip): boolean {
  if (chip === "all") return true;
  if (chip === "rent") return listingKind(product) === "Rent";
  if (chip === "sale") return listingKind(product) === "Sale";
  if (chip === "spare") return listingKind(product) === "Spare";
  return listingKind(product) === "Material";
}

export function chipProducts(products: Product[], chip: ShopChip, query = ""): Product[] {
  const needle = query.trim().toLowerCase();
  return products.filter((product) => {
    if (!matchesChip(product, chip)) return false;
    if (!needle) return true;
    const hay = `${product.title} ${product.attributes?.location ?? ""} ${product.category ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
}

export function sectionCounts(products: Product[]): Record<ShopChip, number> {
  return {
    all: products.length,
    rent: products.filter((product) => listingKind(product) === "Rent").length,
    sale: products.filter((product) => listingKind(product) === "Sale").length,
    spare: products.filter((product) => listingKind(product) === "Spare").length,
    material: products.filter((product) => listingKind(product) === "Material").length,
  };
}
