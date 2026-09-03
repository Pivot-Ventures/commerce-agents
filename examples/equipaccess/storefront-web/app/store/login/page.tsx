// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { LoginScreen, useDeskSession } from "web-shared";
import { api } from "@/lib/store-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004";
const STORE_DESK =
  process.env.NEXT_PUBLIC_STORE_DESK_URL ?? (API_URL ? "http://localhost:3104" : "/store");

export default function StorefrontStoreLoginPage() {
  const desk = useDeskSession(api, "store");

  return (
    <LoginScreen
      role="store"
      apiRoot={api.root}
      apiPrefix="/api/merchant"
      signup={
        <a href={`${STORE_DESK.replace(/\/$/, "")}/register`}>Create a store account</a>
      }
      onSignedIn={(session) => {
        desk.remember({ sessionId: session.sessionId, name: session.name, role: "store" }, session.persist);
        window.location.assign(STORE_DESK);
      }}
    />
  );
}
