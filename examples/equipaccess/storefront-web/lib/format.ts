// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** UGX figures as the mockups show them: 1,200,000 UGX, or 1,200k UGX on compact cards. */

const ugx = new Intl.NumberFormat("en-UG");

export type ListingKind = "Rent" | "Sale" | "Spare" | "Material";
export type ListingSource =
  | "yard"
  | "jiji"
  | "mantrac"
  | "lexa"
  | "clone"
  | "heavyequipmentuganda"
  | "alibaba"
  | "indiamart";

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
  if (folded === "alibaba") return "alibaba";
  if (folded === "indiamart") return "indiamart";
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

export function stockOf(product: { in_stock?: boolean; attributes?: Record<string, string> }): number {
  const raw = product.attributes?.stock;
  if (raw == null || raw === "") return product.in_stock === false ? 0 : 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return product.in_stock === false ? 0 : 1;
  return Math.max(0, parsed);
}

export function lineListingKind(item: { option_values?: Record<string, string> }): ListingKind {
  const folded = (item.option_values?.type ?? "").trim().toLowerCase();
  if (folded === "sale") return "Sale";
  if (folded === "spare") return "Spare";
  if (folded === "material") return "Material";
  if (folded === "rent") return "Rent";
  if (item.option_values?.start_date) return "Rent";
  return "Sale";
}

export function isHireLine(item: { option_values?: Record<string, string> }): boolean {
  return lineListingKind(item) === "Rent";
}

export function cartMode(
  cart: { items?: { option_values?: Record<string, string> }[] } | null,
): "empty" | "hire" | "sale" | "mixed" {
  const items = cart?.items ?? [];
  if (!items.length) return "empty";
  const hire = items.some(isHireLine);
  const sale = items.some((item) => !isHireLine(item));
  if (hire && sale) return "mixed";
  return hire ? "hire" : "sale";
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
    case "alibaba":
      return "Alibaba.com";
    case "indiamart":
      return "IndiaMART";
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
    case "alibaba":
      return "Continue on Alibaba.com";
    case "indiamart":
      return "Continue on IndiaMART";
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

// General haulage method price per km, for rental/sale machine classes that don't need
// a lowbed trailer. Calibrated so 18 km (Mukono yard -> Mukono industrial) quotes
// 240,000 UGX one-way, matching the backend's fixture haulage row (api/rates.py).
const HAULAGE_PER_KM = 240_000 / 18;

// Lowbed trailer method price per km, for machine classes too heavy/tracked to
// self-drive. Calibrated against a real market quote: Kampala -> Bukomero is ~80-100 km
// by road and a lowbed quote for that run is UGX 1,500,000 -- 15,000 UGX/km * 100 km
// matches exactly. Mirrors LOWBED_PER_KM_UGX / LOWBED_MACHINE_CLASSES in api/rates.py.
const LOWBED_PER_KM = 15_000;
const LOWBED_MACHINE_CLASSES = new Set([
  "excavator",
  "bulldozer",
  "loader",
  "skid steer",
  "grader",
  "crane",
]);

export function requiresLowbed(machineClass?: string | null): boolean {
  return Boolean(machineClass) && LOWBED_MACHINE_CLASSES.has(machineClass!.trim().toLowerCase());
}

// Mirrors YARD_TO_SITE_KM in api/rates.py -- keep both in sync.
const YARD_TO_SITE_KM: Record<string, number> = {
  "mukono|mukono": 18,
  "mukono|kampala": 22,
  "mukono|ntinda": 34,
  "mukono|entebbe": 48,
  "mukono|namanve": 16,
  "mukono|wakiso": 28,
  "mukono|jinja": 74,
  "mukono|gulu": 320,
  "mukono|bukomero": 118,
  "kampala|kampala": 12,
  "kampala|ntinda": 8,
  "kampala|mukono": 22,
  "kampala|entebbe": 40,
  "kampala|namanve": 18,
  "kampala|bukomero": 100,
  "kampala|wakiso": 20,
  "entebbe|entebbe": 10,
  "entebbe|kampala": 40,
  "entebbe|ntinda": 42,
  "entebbe|mukono": 48,
  "jinja|jinja": 8,
  "jinja|kampala": 80,
  "jinja|mukono": 74,
};

export function haulageFeeUgx(yard?: string | null, site?: string | null, machineClass?: string | null): number {
  if (!yard || !site) return 0;
  const km = YARD_TO_SITE_KM[`${yard.trim().toLowerCase()}|${site.trim().toLowerCase()}`];
  if (!km) return 0;
  const perKm = requiresLowbed(machineClass) ? LOWBED_PER_KM : HAULAGE_PER_KM;
  return Math.round(perKm * km);
}

export function materialsDeliveryFee(site?: string | null): number {
  const folded = (site ?? "").trim().toLowerCase();
  if (!folded) return 0;
  if (folded.includes("ntinda")) return 180_000;
  if (folded.includes("kampala") || folded.includes("namanve") || folded.includes("wakiso")) return 150_000;
  if (folded.includes("mukono")) return 120_000;
  return 180_000;
}

// Kampala's urban/peri-urban belt gets a flat local courier fee; upcountry is
// zone-tiered by real road distance from Kampala, shaped like DHL Domestic Uganda's
// own zoning, bounded to the market range an operator actually quotes: UGX 30,000
// nearby up to UGX 100,000 far upcountry. Mirrors spares_delivery_fee() in
// api/rates.py -- keep both in sync.
const SPARES_KAMPALA_METRO = ["kampala", "ntinda", "namanve", "wakiso", "mukono", "entebbe"];
const SPARES_NEAR_TOWNS = [
  "jinja", "mityana", "mubende", "luweero", "luwero", "masaka", "iganga",
  "kayunga", "bukomero", "kiboga", "lugazi", "njeru", "mpigi",
];
const SPARES_MID_TOWNS = ["soroti", "hoima", "kasese", "mbale", "fort portal", "fortportal", "masindi"];
const SPARES_FAR_TOWNS = [
  "gulu", "mbarara", "arua", "kabale", "moroto", "kitgum", "adjumani", "kisoro", "lira",
];

export function sparesDeliveryFee(site?: string | null): number {
  const folded = (site ?? "").trim().toLowerCase();
  if (!folded) return 0;
  if (SPARES_KAMPALA_METRO.some((town) => folded.includes(town))) return 10_000;
  if (SPARES_FAR_TOWNS.some((town) => folded.includes(town))) return 100_000;
  if (SPARES_MID_TOWNS.some((town) => folded.includes(town))) return 60_000;
  if (SPARES_NEAR_TOWNS.some((town) => folded.includes(town))) return 30_000;
  // Unrecognized upcountry text: quote the middle of the market range rather than
  // silently returning 0, which would look like delivery was free.
  return 60_000;
}
