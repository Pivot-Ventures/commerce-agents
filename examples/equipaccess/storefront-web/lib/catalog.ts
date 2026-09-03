// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { isWebFind, listingKind } from "./format";
import type { Product } from "./types";

export type ShopChip = "all" | "rent" | "sale" | "spare" | "material" | "web";

export function matchesChip(product: Product, chip: ShopChip): boolean {
  if (chip === "all") return true;
  if (chip === "web") return true;
  if (chip === "rent") return listingKind(product) === "Rent";
  if (chip === "sale") return listingKind(product) === "Sale";
  if (chip === "spare") return listingKind(product) === "Spare";
  return listingKind(product) === "Material";
}

export function chipProducts(products: Product[], chip: ShopChip, query = ""): Product[] {
  const needle = query.trim().toLowerCase();
  return products.filter((product) => {
    if (chip === "web") {
      if (needle) {
        const hay = `${product.title} ${product.attributes?.location ?? ""} ${product.attributes?.source ?? ""} ${product.short_description ?? ""}`.toLowerCase();
        if (!hay.includes(needle) && !needle.split(/\s+/).every((part) => hay.includes(part))) {
          return false;
        }
      }
      return true;
    }
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
    web: products.filter((product) => isWebFind(product)).length,
  };
}
