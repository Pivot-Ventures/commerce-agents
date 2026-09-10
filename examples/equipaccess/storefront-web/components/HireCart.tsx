// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";
import { api, requestHire } from "@/lib/api";
import { cartMode, formatUgx, isHireLine, lineListingKind } from "@/lib/format";
import type { CartItem, CartPayload } from "@/lib/types";
import { MachineMark } from "./MachineCard";

function lineMeta(item: CartItem): string {
  if (isHireLine(item)) {
    const start = item.option_values?.start_date;
    const end = item.option_values?.end_date;
    const days = item.option_values?.number_of_days;
    const rate = item.option_values?.rate_type ?? "Daily";
    if (start && end) return `${start} – ${end} (${days ?? "?"} days) · ${rate} rate · qty ${item.quantity}`;
    return `${rate} rate · qty ${item.quantity}`;
  }
  const kind = lineListingKind(item);
  if (kind === "Spare") return `Spare · qty ${item.quantity}`;
  if (kind === "Material") return `Materials · qty ${item.quantity}`;
  return `Sale · qty ${item.quantity}`;
}

export default function HireCart({
  cart,
  onRequested,
  onCart,
}: {
  cart: CartPayload | null;
  onRequested?: (hireId: string) => void;
  onCart?: (cart: CartPayload) => void;
}) {
  const [result, setResult] = useState<string | null>(null);
  const items = cart?.items ?? [];
  const mode = cartMode(cart);
  const hire = mode === "hire";
  const sale = mode === "sale";
  const haulage = hire || mode === "mixed" ? cart?.haulage : null;
  const deposit = hire ? (cart?.deposit ?? 0) : 0;
  const subtotal = cart?.subtotal ?? 0;
  const haulageFee = haulage?.fee ?? 0;
  const total = subtotal + haulageFee + deposit;
  const heading = hire ? "Your hire" : mode === "mixed" ? "Your order" : "Your cart";
  const empty = hire
    ? "The hire cart is empty. Pick a rental from Shop."
    : "The cart is empty. Pick a listing from Shop.";
  const cta = hire ? "Request this hire" : sale ? "Request this purchase" : "Request this order";
  const footnote = hire
    ? "No charge yet. A person confirms haulage, then you pay."
    : sale
      ? "No charge yet. The yard confirms the sale, then you pay."
      : "No charge yet. Hire lines may need haulage review. Sale lines wait on the yard.";

  async function request() {
    const response = await requestHire();
    if (response?.hire) {
      setResult(`${response.hire.hire_id} staged — ${response.hire.note}`);
      onRequested?.(response.hire.hire_id);
      const next = await api.fetchCart<CartPayload>();
      if (next && onCart) onCart(next);
    } else {
      setResult(hire ? "Could not request this hire. Nothing was charged." : "Could not request this order. Nothing was charged.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-(--line) bg-white p-5 shadow-(--shadow-sm)">
        <h2 className="eq-display text-2xl font-bold text-(--navy)">{heading}</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-[14px] text-(--ink-soft)">{empty}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {items.map((item) => (
              <li key={item.product_id} className="flex gap-3 border-b border-(--line) pb-4">
                <MachineMark product={{ product_id: item.product_id, title: item.title, price: item.price }} className="h-16 w-16 rounded-lg text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-(--navy)">{item.title}</div>
                  <div className="text-[13px] text-(--ink-soft)">{lineMeta(item)}</div>
                </div>
                <div className="font-semibold text-(--navy)">{formatUgx(item.line_total)}</div>
              </li>
            ))}
            {haulage ? (
              <li className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-(--navy)">Haulage: {haulage.from} → {haulage.to}</div>
                  <div className="text-[13px] text-(--ink-soft)">Distance: {haulage.distance_km} km</div>
                  <span className="mt-1 inline-block rounded-full bg-(--accent-soft) px-2 py-0.5 text-[11px] font-semibold text-(--accent-ink)">
                    Needs haulage review
                  </span>
                </div>
                <div className="font-semibold text-(--navy)">{formatUgx(haulage.fee)}</div>
              </li>
            ) : null}
          </ul>
        )}
      </section>
      <aside className="rounded-2xl border border-(--line) bg-white p-5 shadow-(--shadow-sm)">
        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatUgx(subtotal)}</dd>
          </div>
          {hire || mode === "mixed" ? (
            <div className="flex justify-between">
              <dt>Haulage</dt>
              <dd>{haulage ? formatUgx(haulageFee) : "—"}</dd>
            </div>
          ) : null}
          {hire ? (
            <div className="flex justify-between">
              <dt>Deposit (refundable)</dt>
              <dd>{formatUgx(deposit)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-(--line) pt-2 text-lg font-bold text-(--amber)">
            <dt>Total</dt>
            <dd>{formatUgx(total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[12px] text-(--ink-soft)">
          All prices in Ugandan Shillings (UGX). VAT inclusive.
          {hire
            ? " Deposit equals one-way haulage. To+from is charged later on Flutterwave hosted checkout."
            : " Sale, spare, and material lines are purchase totals. Nothing is charged here."}
        </p>
        <div className="mt-4 space-y-2 text-[13px]">
          <label className="flex items-start gap-2 rounded-lg border border-(--amber) bg-(--accent-soft)/40 p-2">
            <input type="radio" defaultChecked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Flutterwave (card or mobile money)</span>
              <span className="block text-(--ink-soft)">Hosted checkout handoff. No auto-charge.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-(--line) p-2">
            <input type="radio" readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Bank transfer</span>
              <span className="block text-(--ink-soft)">Manual receipt. No auto-charge.</span>
            </span>
          </label>
        </div>
        <button
          type="button"
          disabled={!items.length}
          onClick={() => void request()}
          className="btn-primary mt-4 w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {cta}
        </button>
        <p className="mt-2 text-center text-[11px] text-(--ink-soft)">{footnote}</p>
        {result ? <p className="mt-3 rounded-lg bg-(--ok-soft) px-3 py-2 text-[13px] text-(--ok)">{result}</p> : null}
        {hire ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-(--ink-soft)">
            <span>Operator optional</span>
            <span>Fuel: full-to-full</span>
            <span>Insurance optional</span>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
