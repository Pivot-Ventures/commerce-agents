// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useMemo, useState } from "react";
import { addToCart, setHireWindow } from "@/lib/api";
import {
  formatListPrice,
  formatUgx,
  haulageFeeUgx,
  haulageKm,
  hirePeriodLabel,
  hirePeriods,
  isHireListing,
  isPriceOnRequest,
  isWebFind,
  listingKind,
  listingSource,
  materialsDeliveryFee,
  sourceCta,
  sourceLabel,
} from "@/lib/format";
import type { CartPayload, Product } from "@/lib/types";
import { MachineMark } from "./MachineCard";

const DEFAULT_START = "2026-09-12";
const DEFAULT_END = "2026-09-21";

function daysBetween(start: string, end: string): number {
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 1;
  return Math.round((to - from) / 86_400_000) + 1;
}

function unitRate(product: Product, rate: string): number {
  const attrs = product.attributes ?? {};
  if (rate === "Weekly") return Number(attrs.weekly_rate ?? Number(attrs.daily_rate ?? product.price) * 6);
  if (rate === "Monthly") return Number(attrs.monthly_rate ?? Number(attrs.daily_rate ?? product.price) * 22);
  return Number(attrs.daily_rate ?? product.price);
}

export default function HireSummary({
  product,
  cart,
  quantity,
  onQuantity,
  onCart,
}: {
  product: Product | null;
  cart: CartPayload | null;
  quantity?: number;
  onQuantity?: (quantity: number) => void;
  onCart: (cart: CartPayload) => void;
}) {
  const window = cart?.hire_window;
  const kind = product ? listingKind(product) : "Rent";
  const hire = product ? isHireListing(product) : true;
  const web = product ? isWebFind(product) : false;
  const source = product ? listingSource(product) : "yard";
  const qty = Math.max(1, quantity ?? 1);
  const [site, setSite] = useState(window?.site_location ?? "Ntinda");
  const [start, setStart] = useState(window?.start ?? DEFAULT_START);
  const [end, setEnd] = useState(window?.end ?? DEFAULT_END);
  const [haulageOn, setHaulageOn] = useState(window?.include_haulage ?? true);
  const [deliver, setDeliver] = useState(true);

  useEffect(() => {
    if (window?.start) setStart(window.start);
    if (window?.end) setEnd(window.end);
    if (window?.site_location) setSite(window.site_location);
    if (window?.include_haulage != null) setHaulageOn(window.include_haulage);
    if (product && !isHireListing(product) && window?.include_delivery != null) {
      setDeliver(window.include_delivery);
    }
  }, [product, window?.start, window?.end, window?.site_location, window?.include_haulage, window?.include_delivery]);

  const rate = window?.rate_type ?? product?.attributes?.rate_type ?? "Daily";
  const days = window?.days ?? daysBetween(start, end);
  const hireSubtotal = useMemo(() => {
    if (!product || !hire) return 0;
    return hirePeriods(days, rate) * unitRate(product, rate);
  }, [product, hire, days, rate]);
  const yard = product?.attributes?.location;
  const estimatedHaulage = product ? haulageFeeUgx(yard, site) : null;
  const estimatedKm = product ? haulageKm(yard, site) : null;
  const haulageFee = haulageOn ? (estimatedHaulage ?? 0) : 0;
  const deliveryFee = deliver ? materialsDeliveryFee(site) : 0;
  const goodsTotal = product && !hire ? qty * (isPriceOnRequest(product) ? 0 : product.price) : 0;
  const total = hire ? hireSubtotal + haulageFee : goodsTotal + (kind === "Sale" ? 0 : deliveryFee);

  async function applyWindow(next: {
    start_date?: string;
    end_date?: string;
    rate_type?: string;
    site_location?: string;
    yard_location?: string;
    include_haulage?: boolean;
    include_delivery?: boolean;
  }) {
    const updated = await setHireWindow({
      ...next,
      yard_location: next.yard_location ?? (hire ? yard : undefined),
    });
    if (updated) onCart(updated);
  }

  async function add() {
    if (!product || web) return;
    if (hire) {
      await setHireWindow({
        start_date: start,
        end_date: end,
        rate_type: rate,
        site_location: site,
        yard_location: yard,
        include_haulage: haulageOn,
      });
    } else {
      await setHireWindow({
        site_location: site,
        include_delivery: deliver,
      });
    }
    const next = await addToCart(product.product_id, hire ? 1 : qty);
    if (next) onCart(next);
  }

  const heading =
    web ? "External listing" : kind === "Rent" ? "Live hire summary" : kind === "Sale" ? "Sale listing" : "Order summary";

  return (
    <aside className="flex h-full flex-col border-l border-(--line) bg-white">
      <div className="flex items-center justify-between border-b border-(--line) px-4 py-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-(--navy)">
          {heading}
          {product ? <span className="h-2 w-2 rounded-full bg-(--ok)" aria-hidden /> : null}
        </h2>
        <span className="text-[11px] font-semibold text-(--ink-soft)">
          {web ? "Source checkout" : "No charge yet"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {product ? (
          <div className="flex gap-3">
            <MachineMark product={product} className="h-14 w-14 rounded-lg text-sm" />
            <div>
              <div className="font-bold text-(--navy)">{product.title}</div>
              <div className="text-[13px] text-(--amber)">{formatListPrice(product)}</div>
              <div className="text-[12px] text-(--ink-soft)">
                {product.attributes?.location ?? "Uganda"}
                {web ? ` · ${sourceLabel(source)}` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 place-items-center px-4 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-(--well) text-(--ink-soft)">
                ⌘
              </div>
              <p className="text-[13px] text-(--ink-soft)">Nothing selected — pick a machine or a bag of cement</p>
            </div>
          </div>
        )}

        {product && web ? (
          <>
            <div className="rounded-xl bg-(--info-soft) px-3 py-2 text-[13px] text-(--info)">
              Checkout stays on {sourceLabel(source)}. We open their listing with your dates.
            </div>
            <p className="text-[11px] text-(--ink-soft)">
              Checkout happens on the source site for external items. EquipAccess does not process payment for web
              finds.
            </p>
          </>
        ) : null}

        {product && hire && !web ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                Start
                <input
                  type="date"
                  value={start}
                  onChange={(event) => {
                    const next = event.target.value;
                    setStart(next);
                    void applyWindow({ start_date: next, end_date: end, include_haulage: haulageOn, site_location: site });
                  }}
                  className="mt-1 w-full rounded-lg border border-(--line) px-2 py-1.5 text-[13px] font-semibold text-(--navy)"
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                End
                <input
                  type="date"
                  value={end}
                  onChange={(event) => {
                    const next = event.target.value;
                    setEnd(next);
                    void applyWindow({ start_date: start, end_date: next, include_haulage: haulageOn, site_location: site });
                  }}
                  className="mt-1 w-full rounded-lg border border-(--line) px-2 py-1.5 text-[13px] font-semibold text-(--navy)"
                />
              </label>
            </div>
            <div className="text-[13px] text-(--ink-soft)">{days} days</div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">Rate</div>
              <div className="flex gap-1">
                {(["Daily", "Weekly", "Monthly"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => void applyWindow({ rate_type: option, include_haulage: haulageOn, site_location: site })}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-[12px] font-semibold ${
                      rate === option ? "border-(--amber) bg-(--amber) text-(--navy)" : "border-(--line) bg-white"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              Site
              <input
                value={site}
                onChange={(event) => setSite(event.target.value)}
                onBlur={() => void applyWindow({ site_location: site, include_haulage: haulageOn, start_date: start, end_date: end })}
                className="mt-1 w-full rounded-lg border border-(--line) px-2 py-1.5 text-[13px] font-semibold text-(--navy)"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-(--line) px-3 py-2 text-[13px]">
              <span>
                <span className="font-semibold text-(--navy)">Haulage to site</span>
                <span className="block text-(--ink-soft)">
                  {haulageOn && product && estimatedKm != null
                    ? `${yard ?? "yard"} → ${site || "site"} · ${estimatedKm} km`
                    : haulageOn && product
                      ? `${yard ?? "yard"} → ${site || "site"} · distance pending`
                      : "Include transport to site"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={haulageOn}
                onChange={(event) => {
                  const next = event.target.checked;
                  setHaulageOn(next);
                  void applyWindow({ include_haulage: next, site_location: site, start_date: start, end_date: end });
                }}
              />
            </label>
          </>
        ) : null}

        {product && (kind === "Material" || kind === "Spare") && !web ? (
          <>
            <div className="flex items-center justify-between rounded-xl border border-(--line) px-3 py-2">
              <span className="text-[13px] font-semibold text-(--navy)">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-md border border-(--line)"
                  onClick={() => onQuantity?.(Math.max(1, qty - 1))}
                >
                  −
                </button>
                <span className="min-w-[5ch] text-center text-[13px] font-bold">
                  {qty} {product.attributes?.unit ?? "pcs"}
                </span>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-md border border-(--line)"
                  onClick={() => onQuantity?.(qty + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              Delivery site
              <input
                value={site}
                onChange={(event) => setSite(event.target.value)}
                onBlur={() => void applyWindow({ site_location: site, include_delivery: deliver })}
                className="mt-1 w-full rounded-lg border border-(--line) px-2 py-1.5 text-[13px] font-semibold text-(--navy)"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-(--line) px-3 py-2 text-[13px]">
              <span className="font-semibold text-(--navy)">Deliver to site</span>
              <input
                type="checkbox"
                checked={deliver}
                onChange={(event) => {
                  const next = event.target.checked;
                  setDeliver(next);
                  void applyWindow({ site_location: site, include_delivery: next });
                }}
              />
            </label>
            <p className="text-[12px] text-(--ok)">Available for collection or delivery.</p>
          </>
        ) : null}

        {product && kind === "Sale" && !web ? (
          <p className="text-[13px] text-(--ink-soft)">
            {isPriceOnRequest(product)
              ? "Buy, not hire. The dealer has not published a list price."
              : "Buy, not hire. Sale stock is the list price."}
          </p>
        ) : null}

        {product && !web ? (
          <dl className="space-y-1 text-[13px]">
            {hire ? (
              <>
                <div className="flex justify-between">
                  <dt>
                    {hirePeriodLabel(days, rate)} × {formatUgx(unitRate(product, rate), true).replace(" UGX", "")}
                  </dt>
                  <dd>{formatUgx(hireSubtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Haulage</dt>
                  <dd>
                    {haulageOn && estimatedHaulage == null
                      ? "Quote pending"
                      : haulageOn && haulageFee
                        ? formatUgx(haulageFee)
                        : "0 UGX"}
                  </dd>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <dt>{kind === "Sale" ? "Sale price" : `${qty} × ${formatUgx(product.price)}`}</dt>
                  <dd>{isPriceOnRequest(product) ? "Price on request" : formatUgx(goodsTotal)}</dd>
                </div>
                {kind !== "Sale" ? (
                  <div className="flex justify-between">
                    <dt>Delivery to site {site || "—"}</dt>
                    <dd>{deliver ? formatUgx(deliveryFee) : "0 UGX"}</dd>
                  </div>
                ) : null}
              </>
            )}
            <div className="flex justify-between border-t border-(--line) pt-1 text-[18px] font-bold text-(--navy)">
              <dt>Total</dt>
              <dd className="text-(--amber)">{isPriceOnRequest(product) && !hire ? "Price on request" : formatUgx(total)}</dd>
            </div>
          </dl>
        ) : null}

        {product && !web && (kind === "Material" || kind === "Spare") ? (
          <p className="text-[11px] text-(--ink-soft)">
            Yard price
            {product.attributes?.price_source ? ` • ${sourceLabel(product.attributes.price_source)} market list` : ""}.
          </p>
        ) : null}
        {product && hire && !web ? (
          <p className="text-[11px] text-(--ink-soft)">VAT inclusive. Deposit is quoted at checkout and is not taken here.</p>
        ) : null}
      </div>
      <div className="border-t border-(--line) p-4">
        {web && product ? (
          <>
            <a
              href={product.attributes?.source_url || "#"}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl bg-(--navy) py-2.5 text-center text-sm font-bold text-white"
            >
              {sourceCta(source).replace("Continue on", "Open on")}
            </a>
            <p className="mt-2 text-center text-[11px] text-(--ink-soft)">Checkout stays on {sourceLabel(source)}.</p>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!product || (isPriceOnRequest(product ?? {}) && !hire)}
              onClick={() => void add()}
              className="btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {hire ? "Add to hire cart" : kind === "Material" ? "Add materials to cart" : "Add to cart"}
            </button>
            <p className="mt-2 text-center text-[11px] text-(--ink-soft)">No charge yet. Pay when confirmed.</p>
          </>
        )}
      </div>
    </aside>
  );
}
