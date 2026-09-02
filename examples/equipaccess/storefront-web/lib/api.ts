// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { AgentApi } from "web-shared";
import type { CartPayload, Product } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004";

export const api = new AgentApi(API_URL, "/api");

export const UNREACHABLE =
  "Couldn't reach the ACME Equip API on port 8004. Start it with " +
  "`python scripts/run_demo.py equipaccess` and try again.";

export async function fetchProducts(): Promise<Product[] | null> {
  const data = await api.get<{ products: Product[] }>("/products", { limit: "100" });
  return data?.products ?? null;
}

export async function addToCart(productId: string, quantity = 1): Promise<CartPayload | null> {
  return api.post<CartPayload>("/cart/add", { product_id: productId, quantity });
}

export async function setHireWindow(body: {
  start_date?: string;
  end_date?: string;
  rate_type?: string;
  site_location?: string;
  include_haulage?: boolean;
}): Promise<CartPayload | null> {
  return api.post<CartPayload>("/hire/window", body);
}

export async function requestHire(): Promise<{ charged: boolean; hire?: { hire_id: string; status: string; note: string } } | null> {
  return api.post("/hire/request", {});
}
