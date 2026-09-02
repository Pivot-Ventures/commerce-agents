// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import HireCart from "@/components/HireCart";
import GenerativeBlock from "@/components/generative";
import { SHOWCASE, SHOWCASE_CART } from "@/lib/showcase-fixtures";

export default function ShowcasePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-(--ink-soft)">
        ACME Equip component showcase
      </p>
      <section className="mt-8" data-component="products">
        <h2 className="mb-3 font-mono text-sm text-(--ink-soft)">products</h2>
        <GenerativeBlock block={{ component: "products", payload: SHOWCASE.products }} status="final" />
      </section>
      <section className="mt-8" data-component="checkout">
        <h2 className="mb-3 font-mono text-sm text-(--ink-soft)">checkout</h2>
        <GenerativeBlock block={{ component: "checkout", payload: SHOWCASE.checkout }} status="final" />
      </section>
      <section className="mt-8" data-component="cart">
        <h2 className="mb-3 font-mono text-sm text-(--ink-soft)">cart</h2>
        <HireCart cart={SHOWCASE_CART} />
      </section>
    </main>
  );
}
