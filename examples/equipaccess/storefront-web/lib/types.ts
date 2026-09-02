// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

export interface Product {
  product_id: string;
  title: string;
  brand?: string | null;
  price: number;
  currency?: string;
  rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
  category?: string | null;
  labels?: string[];
  attributes?: Record<string, string>;
  in_stock?: boolean;
  short_description?: string | null;
  options?: Record<string, string[]>;
  option_values?: Record<string, string>;
  variant_of?: string | null;
}

export interface CartItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  option_values?: Record<string, string>;
  variant_of?: string | null;
  line_total: number;
}

export interface HaulageQuote {
  from?: string;
  to?: string;
  distance_km?: number;
  fee: number;
  status?: string;
  label?: string;
}

export interface HireWindow {
  start: string;
  end: string;
  days: number;
  rate_type: string;
  site_location?: string | null;
  include_haulage?: boolean;
}

export interface CartPayload {
  items: CartItem[];
  item_count: number;
  subtotal: number;
  currency: string;
  hire_window?: HireWindow | null;
  haulage?: HaulageQuote | null;
  deposit?: number;
}

export interface ProductsPayload {
  title?: string;
  layout?: "carousel" | "grid" | "list";
  items: { product: Product; reason?: string | null }[];
}

export interface ComparisonPayload {
  title?: string;
  entries: {
    product_id: string;
    product: Product;
    pros?: string[];
    cons?: string[];
    best_for?: string | null;
  }[];
  dimensions?: string[];
  recommended_product_id?: string | null;
}

export interface PlanPayload {
  title: string;
  intro?: string;
  steps: { label: string; detail?: string | null; products: Product[] }[];
}

export interface GuidePayload {
  title: string;
  sections: { heading: string; body: string }[];
  related_products?: Product[];
  sources?: string[];
}

export interface OrderStatusPayload {
  order_id: string;
  summary: string;
  next_step?: string;
  order?: {
    order_id: string;
    status: string;
    placed_at: string;
    items: { product_id: string; title: string; quantity: number; price: number }[];
    total: number;
    currency?: string;
    estimated_delivery?: string;
    tracking_url?: string;
  };
}

export interface CheckoutHandoff {
  url: string;
  label?: string;
  seller?: string;
}

export interface CheckoutPayload {
  handoffs?: CheckoutHandoff[];
  note?: string;
  fulfillment_method?: "delivery" | "pickup" | "shipping";
  cart: CartPayload;
}
