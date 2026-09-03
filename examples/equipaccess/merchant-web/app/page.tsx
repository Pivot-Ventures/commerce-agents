// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AssistantRail,
  Inspector,
  type PortalNavItem,
  PortalShell,
  type Prefill,
  useMerchantChat,
  useResource,
  useSession,
} from "web-shared";
import AssistantPanel from "@/components/AssistantPanel";
import CalendarView from "@/components/views/CalendarView";
import CampaignsView from "@/components/views/CampaignsView";
import HaulageView from "@/components/views/HaulageView";
import HomeView from "@/components/views/HomeView";
import InventoryView from "@/components/views/InventoryView";
import ListingsView from "@/components/views/ListingsView";
import RatesView from "@/components/views/RatesView";
import { api, fetchOverview, UNREACHABLE } from "@/lib/api";
import type { StagedChange } from "@/lib/types";

type PortalView = "home" | "listings" | "calendar" | "haulage" | "rates" | "inventory" | "campaigns";

function StoreMark() {
  return (
    <span
      aria-hidden
      className="eq-display grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-(--amber) text-[15px] font-bold text-(--navy)"
    >
      AE
    </span>
  );
}

export default function PortalPage() {
  const session = useSession(api);
  const [view, setView] = useState<PortalView>("haulage");
  const [assistantOpen, setAssistantOpen] = useState(false); // closed so the haulage drawer stays first-class
  const [activityOpen, setActivityOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshPortal = useCallback(() => setRefreshKey((value) => value + 1), []);

  const chat = useMerchantChat<StagedChange>(api, {
    ...session,
    unreachable: UNREACHABLE,
    onPortalRefresh: refreshPortal,
  });

  const { data: overview, failed: overviewFailed } = useResource(
    session.sessionId ? fetchOverview : null,
    [session.sessionId, refreshKey],
  );

  const askAssistant = useCallback((text: string) => {
    setAssistantOpen(true);
    setPrefill({ text, nonce: Date.now() });
  }, []);

  const nav = useMemo<PortalNavItem<PortalView>[]>(() => {
    const pending = overview?.haulage_pending ?? 0;
    return [
      { id: "home", label: "Overview", icon: "home" },
      { id: "listings", label: "Listings", icon: "tag" },
      { id: "calendar", label: "Hire calendar", icon: "calendar" },
      { id: "haulage", label: "Haulage queue", icon: "truck", attention: pending || null },
      { id: "rates", label: "Rates", icon: "chart" },
      { id: "inventory", label: "Inventory", icon: "box" },
      { id: "campaigns", label: "Campaigns", icon: "inbox" },
    ];
  }, [overview]);

  return (
    <div className="equip-portal">
      <PortalShell
        brand={{ mark: <StoreMark />, name: "EquipAccess", detail: "ACME Plant Hire · Mukono" }}
        nav={nav}
        view={view}
        onViewChange={setView}
        operator={{ name: session.operator ?? "Mercy N.", role: "Operator" }}
        storeLabel="ACME Plant Hire Mukono · Uganda"
        assistantOpen={assistantOpen}
        assistantBusy={chat.busy}
        onToggleAssistant={() => setAssistantOpen((open) => !open)}
        rail={
          <AssistantRail
            open={assistantOpen}
            storageKey="acme-equip-merchant-panel-width"
            onClose={() => setAssistantOpen(false)}
          >
            {(rail) => (
              <AssistantPanel
                chat={chat}
                prefill={prefill}
                onPrefill={askAssistant}
                newMemoryCount={chat.newMemoryKeys.size}
                onOpenActivity={() => setActivityOpen(true)}
                {...rail}
              />
            )}
          </AssistantRail>
        }
      >
        {session.sessionId ? (
          <>
            {view === "home" ? (
              <HomeView
                data={overview}
                failed={overviewFailed}
                operator={session.operator}
                onAskAssistant={askAssistant}
                onNavigate={setView}
                refreshKey={refreshKey}
              />
            ) : null}
            {view === "listings" ? <ListingsView refreshKey={refreshKey} onAskAssistant={askAssistant} /> : null}
            {view === "calendar" ? <CalendarView refreshKey={refreshKey} /> : null}
            {view === "haulage" ? (
              <HaulageView
                refreshKey={refreshKey}
                onRefresh={refreshPortal}
                onOpenCalendar={() => setView("calendar")}
              />
            ) : null}
            {view === "rates" ? <RatesView refreshKey={refreshKey} onAskAssistant={askAssistant} /> : null}
            {view === "inventory" ? <InventoryView refreshKey={refreshKey} onAskAssistant={askAssistant} /> : null}
            {view === "campaigns" ? <CampaignsView onAskAssistant={askAssistant} /> : null}
          </>
        ) : (
          <p className="text-[14px] text-(--ink-soft)">Starting merchant session…</p>
        )}
      </PortalShell>
      {activityOpen ? (
        <Inspector
          turnCount={chat.turnCount}
          streaming={chat.streaming}
          trace={chat.trace}
          memory={chat.memory}
          newMemoryKeys={chat.newMemoryKeys}
          memoryTitle="Yard memory"
          onClose={() => setActivityOpen(false)}
        />
      ) : null}
    </div>
  );
}
