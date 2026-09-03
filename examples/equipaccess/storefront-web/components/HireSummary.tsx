// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { addToCart, setHireWindow } from "@/lib/api";
import { formatUgx, isHireListing, rateSuffix } from "@/lib/format";
import type { CartPayload, Product } from "@/lib/types";
import { MachineMark } from "./MachineCard";

export default function HireSummary({
  product,
  cart,
  onCart,
}: {
  product: Product | null;
  cart: CartPayload | null;
  onCart: (cart: CartPayload) => void;
}) {
  const window = cart?.hire_window;
  const haulage = cart?.haulage;
  const hire = product ? isHireListing(product) : true;
  const rate = window?.rate_type ?? product?.attributes?.rate_type ?? "Weekly";
  const days = window?.days ?? Number(product?.attributes?.number_of_days ?? 10);
  const subtotal = cart?.subtotal ?? Number(product?.attributes?.quoted_total ?? product?.price ?? 0);
  const haulageFee = haulage?.fee ?? 0;
  const total = hire ? subtotal + haulageFee : (product?.price ?? subtotal);

  async function applyRate(next: string) {
    const updated = await setHireWindow({ rate_type: next, include_haulage: true });
    if (updated) onCart(updated);
  }

  async function add() {
    if (!product) return;
    if (hire) {
      await setHireWindow({
        rate_type: rate,
        site_location: window?.site_location ?? product.attributes?.location,
        include_haulage: true,
      });
    }
    const next = await addToCart(product.product_id, 1);
    if (next) onCart(next);
  }

  return (
    <aside className="flex h-full flex-col border-l border-(--line) bg-white">
      <div className="flex items-center justify-between border-b border-(--line) px-4 py-3">
        <h2 className="text-[15px] font-bold text-(--navy)">{hire ? "Live hire summary" : "Sale listing"}</h2>
        <span className="text-[11px] font-semibold text-(--ink-soft)">No charge yet</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {product ? (
          <div className="flex gap-3">
            <MachineMark product={product} className="h-14 w-14 rounded-lg text-sm" />
            <div>
              <div className="font-bold text-(--navy)">{product.title}</div>
              <div className="text-[13px] text-(--amber)">
                {hire
                  ? `${formatUgx(Number(product.attributes?.daily_rate ?? product.price))}${rateSuffix("Daily")}`
                  : formatUgx(product.price)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-(--ink-soft)">Search a machine to stage a dated quote.</p>
        )}
        {hire && window ? (
          <div className="rounded-xl bg-(--well) px-3 py-2 text-[13px]">
            <div className="font-semibold text-(--navy)">
              {window.start} – {window.end}
            </div>
            <div className="text-(--ink-soft)">{days} days</div>
          </div>
        ) : null}
        {hire ? (
          <>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">Rate</div>
              <div className="flex gap-1">
                {(["Daily", "Weekly", "Monthly"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => void applyRate(option)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-[12px] font-semibold ${
                      rate === option ? "border-(--amber) bg-(--amber) text-(--navy)" : "border-(--line) bg-white"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {days >= 7 ? <p className="mt-1 text-[11px] text-(--ink-soft)">Weekly is usually the better 10-day rate.</p> : null}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-(--line) px-3 py-2 text-[13px]">
              <div>
                <div className="font-semibold text-(--navy)">Haulage to site</div>
                <div className="text-(--ink-soft)">
                  {haulage ? `${haulage.from} → ${haulage.to} · ${haulage.distance_km} km` : "Priced by distance once a site is set"}
                </div>
              </div>
              <span className="font-bold text-(--navy)">{haulage ? formatUgx(haulageFee, true) : "—"}</span>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-(--ink-soft)">Buy, not hire. Sale stock is the list price.</p>
        )}
        <dl className="space-y-1 text-[13px]">
          <div className="flex justify-between">
            <dt>{hire ? "Subtotal" : "Sale price"}</dt>
            <dd>{formatUgx(hire ? subtotal : (product?.price ?? 0))}</dd>
          </div>
          {hire ? (
            <div className="flex justify-between">
              <dt>Haulage</dt>
              <dd>{haulage ? formatUgx(haulageFee) : "—"}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-(--line) pt-1 text-[18px] font-bold text-(--amber)">
            <dt>Total</dt>
            <dd>{formatUgx(total)}</dd>
          </div>
        </dl>
        <p className="text-[11px] text-(--ink-soft)">VAT inclusive. Deposit is quoted at checkout and is not taken here.</p>
      </div>
      <div className="border-t border-(--line) p-4">
        <button
          type="button"
          disabled={!product}
          onClick={() => void add()}
          className="btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {hire ? "Add to hire cart" : "Add to cart"}
        </button>
        <p className="mt-2 text-center text-[11px] text-(--ink-soft)">No charge yet. Pay when confirmed.</p>
      </div>
    </aside>
  );
}
