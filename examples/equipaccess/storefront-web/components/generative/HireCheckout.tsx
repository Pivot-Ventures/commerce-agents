// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useId } from "react";
import { safeHandoffs } from "web-shared";
import { formatUgx } from "@/lib/format";
import type { CheckoutPayload } from "@/lib/types";

export default function HireCheckout({ payload }: { payload: CheckoutPayload }) {
  const handoffs = safeHandoffs(payload.handoffs);
  const noteId = useId();
  const cart = payload.cart;
  const haulage = cart.haulage;
  return (
    <section data-checkout-card className="rounded-2xl border-2 border-(--amber) bg-white p-4 shadow-(--shadow-sm)">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-(--navy)">Ready to request this hire</h3>
        <span className="rounded-full border border-(--line) px-2.5 py-0.5 text-[11px] font-semibold text-(--ink-soft)">
          Not charged
        </span>
      </div>
      {payload.note ? <p className="mt-1 text-[13px] text-(--ink-soft)">{payload.note}</p> : null}
      <div className="mt-3 space-y-2 rounded-lg bg-(--well)/70 p-3 text-sm">
        {cart.items.map((item) => (
          <div key={item.product_id} className="flex justify-between gap-2">
            <span>
              {item.title} × {item.quantity}
            </span>
            <span>{formatUgx(item.line_total)}</span>
          </div>
        ))}
        {haulage ? (
          <div className="flex justify-between gap-2 text-(--accent-ink)">
            <span>Haulage · needs review</span>
            <span>{formatUgx(haulage.fee)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-(--line) pt-1.5 font-bold">
          <span>Estimated total</span>
          <span>{formatUgx(cart.subtotal + (haulage?.fee ?? 0), false)}</span>
        </div>
      </div>
      {handoffs.length ? (
        <div className="mt-3 flex flex-col gap-2">
          {handoffs.map((handoff) => (
            <a
              key={handoff.url}
              href={handoff.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby={noteId}
              className="btn-primary w-full rounded-xl py-2.5 text-center text-sm font-bold"
            >
              {handoff.label ?? "Request this hire"}
            </a>
          ))}
        </div>
      ) : (
        <button disabled aria-describedby={noteId} className="btn-primary mt-3 w-full cursor-not-allowed rounded-xl py-2.5 text-sm font-bold opacity-90">
          Request this hire
        </button>
      )}
      <p id={noteId} className="mt-2 text-center text-[11px] text-(--ink-soft)">
        Nothing is charged here. A person confirms haulage, then you pay.
      </p>
    </section>
  );
}
