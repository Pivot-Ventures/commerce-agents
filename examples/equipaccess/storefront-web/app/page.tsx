// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AgentEvent,
  OrdersView,
  StorePage,
  StoreShell,
  type StoreView,
  useAgentTurn,
  useResource,
  useSession,
} from "web-shared";
import Chat from "@/components/Chat";
import HireCart from "@/components/HireCart";
import HireSummary from "@/components/HireSummary";
import HomeView from "@/components/views/HomeView";
import { api, fetchProducts, UNREACHABLE } from "@/lib/api";
import { formatUgx } from "@/lib/format";
import { NOUNS, OrderThumb } from "@/lib/orders";
import type { CartPayload, Product } from "@/lib/types";

type View = "hire" | "buy" | "parts" | "haulage" | "cart" | "hires";

function Wordmark() {
  return (
    <span className="flex items-center gap-2 pr-2">
      <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-md bg-(--navy) text-[12px] font-bold text-(--amber)">
        AE
      </span>
      <span className="eq-display text-[20px] font-bold tracking-wide text-(--navy)">ACME EQUIP</span>
    </span>
  );
}

export default function StorefrontPage() {
  const session = useSession(api);
  const [view, setView] = useState<View>("hire");
  const [cart, setCart] = useState<CartPayload | null>(null);
  const [picked, setPicked] = useState<Product | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    setPanelOpen(window.innerWidth >= 1280);
  }, []);

  const onEvent = useCallback((event: AgentEvent) => {
    if (event.type === "cart_update") setCart(event.data.cart as CartPayload);
  }, []);

  const chat = useAgentTurn(api, { ...session, unreachable: UNREACHABLE, onEvent });
  const { data: orders, failed: ordersFailed } = useResource(
    session.sessionId ? () => api.fetchOrders() : null,
    [session.sessionId, chat.completed],
  );
  const { data: catalog } = useResource(fetchProducts, [session.sessionId]);

  useEffect(() => {
    if (session.sessionId) void api.fetchCart<CartPayload>().then((next) => next && setCart(next));
  }, [session.sessionId]);

  const machines = useMemo(
    () => (catalog ?? []).filter((product) => (product.attributes?.listing_type ?? "Rent") === "Rent"),
    [catalog],
  );
  const sales = useMemo(
    () => (catalog ?? []).filter((product) => product.attributes?.listing_type === "Sale" && product.category !== "spare-parts"),
    [catalog],
  );
  const parts = useMemo(
    () => (catalog ?? []).filter((product) => product.category === "spare-parts"),
    [catalog],
  );

  const views: StoreView<View>[] = [
    { id: "hire", label: "Hire", icon: "search" },
    { id: "buy", label: "Buy", icon: "tag" },
    { id: "parts", label: "Spare parts", icon: "box" },
    { id: "haulage", label: "Haulage", icon: "truck" },
    { id: "cart", label: "Cart", icon: "bag" },
    { id: "hires", label: "Hires", icon: "calendar" },
  ];
  const shopper = session.shopper ?? { name: "Guest" };
  const count = cart?.items.length ?? 0;

  return (
    <StoreShell
      brand={<Wordmark />}
      views={views}
      view={view}
      onViewChange={setView}
      chat={chat}
      api={api}
      assistantName="Hire assistant"
      shopper={shopper}
      bag={{
        label: "Hire cart",
        count,
        noun: "machine",
        figure: count ? formatUgx(cart?.subtotal ?? 0, true) : null,
      }}
      panel={
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <HireSummary
              product={picked}
              cart={cart}
              onCart={(next) => {
                setCart(next);
                if (next.items.length) setView("cart");
              }}
            />
          </div>
        </div>
      }
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      placeholder="Need a 20-ton excavator in Mukono for 10 days…"
    >
      <div className={view === "hire" ? "h-full" : "hidden"}>
        <Chat
          chat={chat}
          onPick={(product) => {
            setPicked(product);
            setPanelOpen(true);
          }}
          home={
            <HomeView
              name={shopper.name}
              machines={machines}
              onAsk={(text) => {
                setPanelOpen(true);
                void chat.send(text);
              }}
            />
          }
        />
      </div>
      {view === "buy" ? (
        <StorePage>
          <h1 className="eq-hero">Buy</h1>
          <p className="text-(--ink-soft)">Used machines. The assistant only shows these when you ask to buy.</p>
          <CatalogGrid products={sales} />
        </StorePage>
      ) : null}
      {view === "parts" ? (
        <StorePage>
          <h1 className="eq-hero">Spare parts</h1>
          <p className="text-(--ink-soft)">A side catalog. Buy, not hire.</p>
          <CatalogGrid products={parts} />
        </StorePage>
      ) : null}
      {view === "haulage" ? (
        <StorePage>
          <h1 className="eq-hero">Haulage</h1>
          <p className="max-w-xl text-(--ink-2)">
            Transport to site is priced by distance. A hire that includes haulage is staged as Haulage
            Review — nothing is charged in the assistant. A person at the yard approves or counters
            the quote, then you pay on the host checkout.
          </p>
          <HireCart cart={cart} onCart={setCart} />
        </StorePage>
      ) : null}
      {view === "cart" ? (
        <StorePage>
          <HireCart cart={cart} onCart={setCart} />
        </StorePage>
      ) : null}
      {view === "hires" ? (
        <OrdersView
          orders={orders}
          failed={ordersFailed}
          nouns={NOUNS}
          subtitle="Requested hires land in Haulage Review until a person confirms transport."
          thumb={(order) => <OrderThumb order={order} />}
        />
      ) : null}
    </StoreShell>
  );
}

function CatalogGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => (
        <article key={product.product_id} className="rounded-2xl border border-(--line) bg-white p-4">
          <h2 className="font-bold text-(--navy)">{product.title}</h2>
          <p className="text-[13px] text-(--ink-soft)">{product.short_description}</p>
          <p className="mt-2 font-semibold text-(--amber)">{formatUgx(product.price)}</p>
        </article>
      ))}
    </div>
  );
}
