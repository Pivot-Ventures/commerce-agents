// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useCallback, useEffect, useState } from "react";
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
import ShopView from "@/components/views/ShopView";
import { type ShopChip } from "@/lib/catalog";
import { api, fetchProducts, setHireWindow, UNREACHABLE } from "@/lib/api";
import { cartMode, formatUgx, isHireListing, isYardListing, stockOf } from "@/lib/format";
import { NOUNS, OrderThumb } from "@/lib/orders";
import type { CartPayload, Product } from "@/lib/types";

type View = "shop" | "rent" | "sale" | "spare" | "material" | "search" | "cart" | "orders";

function Wordmark() {
  return (
    <span className="flex items-center gap-3 pr-2">
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-md bg-(--amber) text-(--navy)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Zm0-5.2 1.4 2.7 2.9.2-2.1 2.1.7 2.8L12 9.6 8.1 10.8l.7-2.8-2.1-2.1 2.9-.2Zm0 15.2-1.4-2.7-2.9-.2 2.1-2.1-.7-2.8L12 14.4l3.9-1.2-.7 2.8 2.1 2.1-2.9.2Z" />
          </svg>
        </span>
        <span className="eq-display text-[20px] font-bold tracking-wide text-(--navy)">EquipAccess</span>
      </span>
      <span className="hidden items-center gap-1 text-[13px] font-semibold text-(--navy) md:flex">
        Kampala
        <span aria-hidden className="text-(--ink-soft)">▾</span>
      </span>
    </span>
  );
}

function viewChip(view: View): ShopChip {
  if (view === "rent") return "rent";
  if (view === "sale") return "sale";
  if (view === "spare") return "spare";
  if (view === "material") return "material";
  return "all";
}

export default function StorefrontPage() {
  const session = useSession(api);
  const [view, setView] = useState<View>("shop");
  const [chip, setChip] = useState<ShopChip>("all");
  const [cart, setCart] = useState<CartPayload | null>(null);
  const [picked, setPicked] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
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

  const pick = useCallback((product: Product) => {
    setPicked(product);
    setPanelOpen(true);
    const stock = stockOf(product);
    const materialDefault = product.attributes?.unit === "bag" ? 200 : 1;
    setQuantity(stock > 0 ? Math.min(materialDefault, stock) : 1);
    if (isHireListing(product) && isYardListing(product)) {
      void setHireWindow({
        start_date: "2026-09-12",
        end_date: "2026-09-21",
        rate_type: "Daily",
        site_location: "Ntinda",
        include_haulage: true,
      }).then((next) => {
        if (next) setCart(next);
      });
    }
  }, []);

  const goView = useCallback((next: View) => {
    setView(next);
    if (next === "shop" || next === "rent" || next === "sale" || next === "spare" || next === "material") {
      setChip(viewChip(next));
    }
  }, []);

  const mode = cartMode(cart);
  const views: StoreView<View>[] = [
    { id: "shop", label: "Shop", icon: "home" },
    { id: "rent", label: "Rental", icon: "truck" },
    { id: "sale", label: "Sale", icon: "tag" },
    { id: "spare", label: "Spares", icon: "box" },
    { id: "material", label: "Materials", icon: "inbox" },
    { id: "search", label: "Search", icon: "search" },
    { id: "cart", label: "Cart", icon: "bag" },
    { id: "orders", label: "Orders", icon: "calendar" },
  ];
  const shopper = session.shopper ?? { name: "Guest shopper" };
  const count = cart?.items.length ?? 0;
  const shopOpen = view === "shop" || view === "rent" || view === "sale" || view === "spare" || view === "material";
  const bagLabel = mode === "hire" ? "Hire cart" : "Cart";
  const bagNoun = mode === "hire" ? "machine" : "item";

  return (
    <StoreShell
      brand={<Wordmark />}
      views={views}
      view={view}
      onViewChange={goView}
      assistantView="search"
      chat={chat}
      api={api}
      assistantName="Shop assistant"
      shopper={shopper}
      bag={{
        label: bagLabel,
        count,
        noun: bagNoun,
        figure: count ? formatUgx(cart?.subtotal ?? 0, true) : null,
      }}
      panel={
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <HireSummary
              product={picked}
              cart={cart}
              quantity={quantity}
              onQuantity={setQuantity}
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
      placeholder="20-ton excavator, used generator, hydraulic hose, or cement bags…"
    >
      {shopOpen ? (
        <ShopView
          products={catalog}
          chip={chip}
          onChip={(next) => {
            setChip(next);
            setView(next === "all" ? "shop" : next);
          }}
          picked={picked}
          quantity={quantity}
          onPick={pick}
          onQuantity={setQuantity}
        />
      ) : null}
      <div className={view === "search" ? "h-full" : "hidden"}>
        <Chat
          chat={chat}
          onPick={pick}
          home={
            <HomeView
              name={shopper.name}
              onAsk={(text) => {
                setPanelOpen(true);
                void chat.send(text);
              }}
            />
          }
        />
      </div>
      {view === "cart" ? (
        <StorePage>
          <HireCart cart={cart} onCart={setCart} />
        </StorePage>
      ) : null}
      {view === "orders" ? (
        <OrdersView
          orders={orders}
          failed={ordersFailed}
          nouns={NOUNS}
          subtitle="Requested hires land in Haulage Review. Sale, spare, and material orders wait on the yard. Nothing is charged here."
          thumb={(order) => <OrderThumb order={order} />}
        />
      ) : null}
    </StoreShell>
  );
}
