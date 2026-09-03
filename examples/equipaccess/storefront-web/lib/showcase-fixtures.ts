// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Product } from "./types";

const EXCAVATOR: Product = {
  product_id: "AE-EXC-101",
  title: "20-ton excavator — Mukono yard",
  brand: "EquipAccess",
  price: 1200000,
  currency: "UGX",
  rating: 4.8,
  review_count: 126,
  image_url: "/products/excavator.jpg",
  category: "excavators",
  labels: ["In stock", "Best match"],
  attributes: {
    listing_type: "Rent",
    rate_type: "Daily",
    machine_class: "excavator",
    location: "Mukono",
    daily_rate: "1200000",
    weekly_rate: "7200000",
    number_of_days: "10",
    hire_start: "2026-09-14",
    hire_end: "2026-09-23",
    quoted_total: "14400000",
    units_left_for_dates: "2",
  },
  in_stock: true,
  short_description: "A 20-ton tracked excavator at the Mukono yard. Public hire reference UGX 1,200,000 / day.",
};

const LOADER: Product = {
  product_id: "AE-LOD-201",
  title: "Wheel loader — Kampala yard",
  brand: "EquipAccess",
  price: 700000,
  currency: "UGX",
  image_url: "/products/loader.jpg",
  category: "loaders",
  labels: ["In stock"],
  attributes: {
    listing_type: "Rent",
    rate_type: "Daily",
    location: "Kampala",
    daily_rate: "700000",
  },
  in_stock: true,
  short_description: "A wheel loader at the Kampala yard for stockpile and load-out work.",
};

export const SHOWCASE = {
  products: {
    title: "20-ton excavators near Mukono",
    items: [
      { product: EXCAVATOR, reason: "In Mukono, weekly rate for 10 days" },
      { product: LOADER, reason: "Loader if the site needs load-out" },
    ],
  },
  checkout: {
    note: "Nothing is charged here.",
    cart: {
      items: [
        {
          product_id: "AE-EXC-101",
          title: "20-ton excavator — Mukono yard",
          price: 14400000,
          quantity: 1,
          line_total: 14400000,
          option_values: { type: "Rent", start_date: "2026-09-14", end_date: "2026-09-23", number_of_days: "10", rate_type: "Weekly" },
        },
      ],
      item_count: 1,
      subtotal: 14400000,
      currency: "UGX",
      haulage: { from: "Mukono", to: "Mukono", distance_km: 18, fee: 240000, label: "Needs haulage review" },
      deposit: 240000,
    },
    handoffs: [{ url: "https://checkout.flutterwave.com/pay/acme-equip-hire", label: "Request this hire" }],
  },
};

export const SHOWCASE_CART = SHOWCASE.checkout.cart;
