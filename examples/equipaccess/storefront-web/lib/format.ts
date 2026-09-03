// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** UGX figures as the mockups show them: 1,200,000 UGX, or 1,200k UGX on compact cards. */

const ugx = new Intl.NumberFormat("en-UG");

export type ListingKind = "Rent" | "Sale" | "Spare" | "Material";
export type ListingSource = "yard" | "jiji" | "mantrac" | "lexa" | "clone" | "heavyequipmentuganda";

export function formatUgx(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return `${ugx.format(Math.round(value / 1000))}k UGX`;
  }
  return `${ugx.format(Math.round(value))} UGX`;
}

export function listingKind(product: { attributes?: Record<string, string> }): ListingKind {
  const folded = (product.attributes?.listing_type ?? "Rent").trim().toLowerCase();
  if (folded === "sale") return "Sale";
  if (folded === "spare") return "Spare";
  if (folded === "material") return "Material";
  return "Rent";
}

export function listingSource(product: { attributes?: Record<string, string> }): ListingSource {
  const folded = (product.attributes?.source ?? "yard").trim().toLowerCase();
  if (folded === "jiji") return "jiji";
  if (folded === "mantrac") return "mantrac";
  if (folded === "lexa") return "lexa";
  if (folded === "clone") return "clone";
  if (folded === "heavyequipmentuganda") return "heavyequipmentuganda";
  return "yard";
}

export function isHireListing(product: { attributes?: Record<string, string> }): boolean {
  return listingKind(product) === "Rent";
}

export function isYardListing(product: { attributes?: Record<string, string> }): boolean {
  return listingSource(product) === "yard";
}

export function isWebFind(product: { attributes?: Record<string, string> }): boolean {
  return !isYardListing(product);
}

export function isPriceOnRequest(product: { price?: number; attributes?: Record<string, string> }): boolean {
  return product.attributes?.price_on_request === "true" || (product.price ?? 0) <= 0;
}

export function sourceLabel(source: string): string {
  switch (source) {
    case "jiji":
      return "Jiji.ug";
    case "mantrac":
      return "Mantrac";
    case "lexa":
      return "Lexa";
    case "clone":
      return "Clone Supplies";
    case "heavyequipmentuganda":
      return "Heavy Equipment Uganda";
    default:
      return "EquipAccess yard";
  }
}

export function sourceCta(source: string): string {
  switch (source) {
    case "jiji":
      return "Continue on Jiji";
    case "mantrac":
      return "Continue on Mantrac";
    case "lexa":
      return "Continue on Lexa";
    case "clone":
      return "Continue on Clone";
    case "heavyequipmentuganda":
      return "Continue on Heavy Equipment Uganda";
    default:
      return "Open on source";
  }
}

export function badgeLabel(kind: ListingKind): string {
  if (kind === "Rent") return "HIRE";
  if (kind === "Sale") return "SALE";
  if (kind === "Spare") return "SPARE";
  return "MATERIALS";
}

export function productGlyph(product: {
  title?: string;
  category?: string | null;
  attributes?: Record<string, string>;
}): string {
  const hay = `${product.title ?? ""} ${product.category ?? ""} ${product.attributes?.machine_class ?? ""}`.toLowerCase();
  if (hay.includes("excavator") || hay.includes("digger")) return "Exc";
  if (hay.includes("loader") || hay.includes("backhoe")) return "Ldr";
  if (hay.includes("dump") || hay.includes("truck")) return "Dmp";
  if (hay.includes("compactor") || hay.includes("roller")) return "Rol";
  if (hay.includes("generator")) return "Gen";
  if (hay.includes("scaffold")) return "Scf";
  if (hay.includes("crane")) return "Crn";
  if (hay.includes("mixer") || hay.includes("cement") || hay.includes("concrete")) return "Mix";
  if (hay.includes("fork")) return "Frk";
  if (hay.includes("hose") || hay.includes("teeth") || hay.includes("spare") || hay.includes("nipple")) return "Prt";
  if (hay.includes("rebar") || hay.includes("sheet") || hay.includes("brick") || hay.includes("block")) return "Mat";
  return "Eq";
}

export function rateSuffix(rateType?: string | null, product?: { attributes?: Record<string, string> }): string {
  const custom = product?.attributes?.rate_unit;
  if (custom) return ` / ${custom}`;
  const unit = product?.attributes?.unit;
  if (unit && listingKind(product) !== "Rent") return ` / ${unit}`;
  const folded = (rateType ?? "Daily").toLowerCase();
  if (folded.startsWith("week")) return " / week";
  if (folded.startsWith("month")) return " / month";
  return " / day";
}

export function formatListPrice(
  product: { price?: number; attributes?: Record<string, string> },
  compact = false,
): string {
  if (isPriceOnRequest(product)) return "Price on request";
  const kind = listingKind(product);
  const amount = Number(product.attributes?.daily_rate ?? product.price ?? 0);
  const suffix = kind === "Rent" ? rateSuffix(product.attributes?.rate_type, product) : rateSuffix(null, product);
  return `${formatUgx(amount, compact)}${suffix}`;
}

export function materialsDeliveryFee(site?: string | null): number {
  const folded = (site ?? "").trim().toLowerCase();
  if (!folded) return 0;
  if (folded.includes("ntinda")) return 180_000;
  if (folded.includes("kampala") || folded.includes("namanve") || folded.includes("wakiso")) return 150_000;
  if (folded.includes("mukono")) return 120_000;
  return 180_000;
}
