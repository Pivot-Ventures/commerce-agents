// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { AgentApi } from "web-shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004";

export const api = new AgentApi(API_URL, "/api/admin");

export const UNREACHABLE =
  "Couldn't reach the ACME Equip API on port 8004. Start it with " +
  "`python scripts/run_demo.py equipaccess --all` and try again.";

export type AdminListing = {
  listing_id: string;
  store: string;
  location: string;
  type: string;
  submitted: string;
  status: string;
  category?: string;
  product: { product_id: string; title: string; category?: string; price?: number };
};

export type AdminStore = { store_id: string; name: string; location: string; status: string };
export type AdminAgent = { agent_id: string; name: string; region: string; stores: string[]; status: string };
export type AdminCustomer = { user_id: string; name: string; company?: string; location?: string };
export type AdminPayout = {
  payout_id: string;
  store_id: string;
  amount: number;
  currency: string;
  status: string;
  note?: string;
};
export type AdminLane = { lane_id: string; from: string; to: string; km: number; typical_quote_ugx: number };
export type AdminRole = { role: string; description: string };
export type AdminOverview = {
  pending_listings: number;
  haulage_reviews: number;
  payouts_held: number;
  stores: number;
  agents: number;
};

export function fetchListings(status: string) {
  return api.get<{ listings: AdminListing[]; total: number }>("/listings", { status });
}

export function fetchOverview() {
  return api.get<AdminOverview>("/overview");
}

export function fetchStores() {
  return api.get<{ stores: AdminStore[] }>("/stores");
}

export function fetchAgents() {
  return api.get<{ agents: AdminAgent[] }>("/agents");
}

export function fetchCustomers() {
  return api.get<{ customers: AdminCustomer[] }>("/customers");
}

export function fetchPayouts() {
  return api.get<{ payouts: AdminPayout[]; note: string }>("/payouts");
}

export function fetchShipping() {
  return api.get<{ lanes: AdminLane[] }>("/shipping");
}

export function fetchRoles() {
  return api.get<{ roles: AdminRole[] }>("/roles");
}

export function decideListing(listingId: string, action: "approve" | "reject") {
  return api.post<{ ok: boolean; listing_id: string; status: string }>(
    `/listings/${encodeURIComponent(listingId)}/${action}`,
    {},
  );
}

export async function tryPayPayout(payoutId: string): Promise<string> {
  const response = await fetch(`${api.base}/payouts/${encodeURIComponent(payoutId)}/pay`, {
    method: "POST",
    headers: api.headers(true),
    body: JSON.stringify({}),
  });
  const body = (await response.json().catch(() => ({}))) as { detail?: string };
  if (response.ok) return "Unexpected: payout executed.";
  return String(body.detail ?? `${response.status}: payouts cannot be executed from this host.`);
}
