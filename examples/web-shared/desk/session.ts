// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useState } from "react";
import type { AgentApi } from "../api";

export type DeskRole = "admin" | "store" | "agent";

export type StoredDesk = {
  sessionId: string;
  name?: string;
  role: DeskRole;
  persist: boolean;
};

export type DeskLoginOk = {
  ok: true;
  sessionId: string;
  name?: string;
  operator?: string;
  role?: string;
  userId?: string;
};

export type DeskLoginErr = { ok: false; error: string };

function storageKey(role: DeskRole): string {
  return `equipaccess.desk.${role}`;
}

export function readDesk(role: DeskRole): StoredDesk | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(role)) ?? window.sessionStorage.getItem(storageKey(role));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDesk;
    return parsed.sessionId ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDesk(role: DeskRole, desk: StoredDesk): void {
  const key = storageKey(role);
  const payload = JSON.stringify(desk);
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
  (desk.persist ? window.localStorage : window.sessionStorage).setItem(key, payload);
}

export function clearDesk(role: DeskRole): void {
  const key = storageKey(role);
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

export async function loginDesk(
  root: string,
  prefix: string,
  email: string,
  password: string,
): Promise<DeskLoginOk | DeskLoginErr> {
  try {
    const response = await fetch(`${root}${prefix}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      session_id?: string;
      name?: string;
      operator?: string;
      role?: string;
      user_id?: string;
      detail?: string;
    };
    if (!response.ok || !data.session_id) {
      return { ok: false, error: data.detail || "Email or password is not recognized." };
    }
    return {
      ok: true,
      sessionId: data.session_id,
      name: data.name ?? data.operator,
      operator: data.operator,
      role: data.role,
      userId: data.user_id,
    };
  } catch {
    return { ok: false, error: "Could not reach the EquipAccess API." };
  }
}

export function useDeskSession(api: AgentApi, role: DeskRole): {
  ready: boolean;
  sessionId: string | null;
  name?: string;
  signOut: () => void;
  remember: (session: Omit<StoredDesk, "persist">, persist: boolean) => void;
} {
  const [ready, setReady] = useState(false);
  const [desk, setDesk] = useState<StoredDesk | null>(null);

  useEffect(() => {
    const stored = readDesk(role);
    if (stored) api.session = stored.sessionId;
    setDesk(stored);
    setReady(true);
  }, [api, role]);

  return {
    ready,
    sessionId: desk?.sessionId ?? null,
    name: desk?.name,
    signOut: () => {
      clearDesk(role);
      api.session = null;
      setDesk(null);
    },
    remember: (session, persist) => {
      const next = { ...session, persist };
      writeDesk(role, next);
      api.session = next.sessionId;
      setDesk(next);
    },
  };
}
