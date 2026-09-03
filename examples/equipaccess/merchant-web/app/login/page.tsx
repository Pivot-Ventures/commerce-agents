// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginScreen, useDeskSession } from "web-shared";
import { api } from "@/lib/api";

export default function StoreLoginPage() {
  const router = useRouter();
  const desk = useDeskSession(api, "store");

  useEffect(() => {
    if (desk.ready && desk.sessionId) router.replace("/");
  }, [desk.ready, desk.sessionId, router]);

  return (
    <LoginScreen
      role="store"
      apiRoot={api.root}
      apiPrefix="/api/merchant"
      signup={<Link href="/register">Create a store account</Link>}
      onSignedIn={(session) => {
        desk.remember({ sessionId: session.sessionId, name: session.name, role: "store" }, session.persist);
        router.replace("/");
      }}
    />
  );
}
