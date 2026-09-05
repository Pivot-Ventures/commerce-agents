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
import { formatUgx, isHireListing, isYardListing } from "@/lib/format";
import { NOUNS, OrderThumb } from "@/lib/orders";
import type { CartPayload, Product } from "@/lib/types";

type View = "shop" | "search" | "buy" | "parts" | "materials" | "web" | "cart" | "hires";

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
  if (view === "buy") return "sale";
  if (view === "parts") return "spare";
  if (view === "materials") return "material";
  if (view === "web") return "web";
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

  const pick = useCallback(
    (product: Product) => {
      setPicked(product);
      setPanelOpen(true);
      const materialDefault = product.attributes?.unit === "bag" ? 200 : 1;
      setQuantity(materialDefault);
      if (isHireListing(product) && isYardListing(product)) {
        void setHireWindow({
          start_date: "2026-09-12",
          end_date: "2026-09-21",
          rate_type: "Daily",
          site_location: "Ntinda",
          yard_location: product.attributes?.location,
          include_haulage: true,
        }).then((next) => {
          if (next) setCart(next);
        });
      }
    },
    [],
  );

  const goView = useCallback((next: View) => {
    setView(next);
    if (next === "shop" || next === "buy" || next === "parts" || next === "materials" || next === "web") {
      setChip(viewChip(next));
    }
  }, []);

  const views: StoreView<View>[] = [
    { id: "shop", label: "Shop", icon: "home" },
    { id: "search", label: "Search", icon: "search" },
    { id: "buy", label: "Buy", icon: "tag" },
    { id: "parts", label: "Spares", icon: "box" },
    { id: "materials", label: "Materials", icon: "inbox" },
    { id: "web", label: "Web finds", icon: "expand" },
    { id: "cart", label: "Cart", icon: "bag" },
    { id: "hires", label: "Hires", icon: "calendar" },
  ];
  const shopper = session.shopper ?? { name: "Guest shopper" };
  const count = cart?.items.length ?? 0;
  const shopOpen = view === "shop" || view === "buy" || view === "parts" || view === "materials" || view === "web";

  return (
    <StoreShell
      brand={<Wordmark />}
      views={views}
      view={view}
      onViewChange={goView}
      assistantView="search"
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
      placeholder="Need a 20-ton excavator in Mukono for 10 days…"
    >
      {shopOpen ? (
        <ShopView
          products={catalog}
          chip={chip}
          onChip={(next) => {
            setChip(next);
            setView(next === "all" ? "shop" : next === "sale" ? "buy" : next === "spare" ? "parts" : next === "material" ? "materials" : next === "web" ? "web" : "shop");
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
