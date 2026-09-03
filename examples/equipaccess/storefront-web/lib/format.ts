// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** UGX figures as the mockups show them: 180,000 UGX, or 180k UGX on compact cards. */

const ugx = new Intl.NumberFormat("en-UG");

export function formatUgx(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return `${ugx.format(Math.round(value / 1000))}k UGX`;
  }
  return `${ugx.format(Math.round(value))} UGX`;
}

export function productGlyph(product: { title?: string; category?: string | null; attributes?: Record<string, string> }): string {
  const hay = `${product.title ?? ""} ${product.category ?? ""} ${product.attributes?.machine_class ?? ""}`.toLowerCase();
  if (hay.includes("excavator") || hay.includes("digger")) return "Exc";
  if (hay.includes("loader") || hay.includes("backhoe")) return "Ldr";
  if (hay.includes("dump") || hay.includes("truck")) return "Dmp";
  if (hay.includes("compactor") || hay.includes("roller")) return "Rol";
  if (hay.includes("generator")) return "Gen";
  if (hay.includes("scaffold")) return "Scf";
  if (hay.includes("crane")) return "Crn";
  if (hay.includes("mixer")) return "Mix";
  if (hay.includes("fork")) return "Frk";
  if (hay.includes("hose") || hay.includes("teeth") || hay.includes("spare")) return "Prt";
  return "Eq";
}

export function rateSuffix(rateType?: string | null): string {
  const folded = (rateType ?? "Daily").toLowerCase();
  if (folded.startsWith("week")) return "/week";
  if (folded.startsWith("month")) return "/month";
  return "/day";
}

export function isHireListing(product: { attributes?: Record<string, string> }): boolean {
  return (product.attributes?.listing_type ?? "Rent") !== "Sale";
}
