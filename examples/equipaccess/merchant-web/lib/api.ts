// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { AgentApi } from "web-shared";
import type { AlertsResponse, ListingDetailResponse, ListingsResponse, OverviewResponse } from "./types";

// Empty string is same-origin (the production image). Unset is the local demo API.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004";

export const api = new AgentApi(API_URL, "/api/merchant");

export const UNREACHABLE =
  "Couldn't reach the ACME Equip API on port 8004. Start it with " +
  "`python scripts/run_demo.py equipaccess --merchant` and try again.";

export function fetchOverview(): Promise<OverviewResponse | null> {
  return api.get<OverviewResponse>("/overview");
}

export function fetchListings(query?: string): Promise<ListingsResponse | null> {
  return api.get<ListingsResponse>("/listings", query ? { query } : undefined);
}

export function fetchListingDetail(listingId: string): Promise<ListingDetailResponse | null> {
  return api.get<ListingDetailResponse>(`/listings/${encodeURIComponent(listingId)}`);
}

export function fetchAlerts(): Promise<AlertsResponse | null> {
  return api.get<AlertsResponse>("/alerts");
}

export type CalendarDay = {
  date: string;
  weekday: string;
  on_hire: number;
  free: number;
  fleet: number;
};

export type CalendarListing = {
  listing_id: string;
  title: string;
  units: number;
  weeks: { week_start: string; units_on_hire: number; units_free: number; occupancy_pct: number }[];
};

export type CalendarPayload = {
  yard: string;
  window: { from?: string; to?: string };
  days: CalendarDay[];
  listings: CalendarListing[];
  haulage_pending: number;
};

export type HaulageItem = {
  hire_id: string;
  created_at: string;
  product_id?: string;
  title?: string;
  quantity?: number;
  site?: string | null;
  site_city?: string | null;
  via?: string | null;
  from_yard?: string | null;
  distance_km?: number | null;
  quote: number;
  status: string;
  subtotal?: number;
  deposit?: number;
  total?: number;
  currency?: string;
  user_id?: string;
};

export function fetchCalendar(): Promise<CalendarPayload | null> {
  return api.get<CalendarPayload>("/calendar");
}

export function fetchHaulage(): Promise<{ queue: HaulageItem[] } | null> {
  return api.get<{ queue: HaulageItem[] }>("/haulage");
}

export function approveHaulage(hireId: string) {
  return api.post<{ ok: boolean; hire_id: string; status: string; quote: number }>(
    `/haulage/${encodeURIComponent(hireId)}/approve`,
    {},
  );
}

export function counterHaulage(hireId: string, quote: number) {
  return api.post<{ ok: boolean; hire_id: string; status: string; quote: number }>(
    `/haulage/${encodeURIComponent(hireId)}/counter`,
    { quote },
  );
}
