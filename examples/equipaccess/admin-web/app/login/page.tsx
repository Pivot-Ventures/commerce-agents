// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginScreen, useDeskSession } from "web-shared";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const desk = useDeskSession(api, "admin");

  useEffect(() => {
    if (desk.ready && desk.sessionId) router.replace("/");
  }, [desk.ready, desk.sessionId, router]);

  return (
    <LoginScreen
      role="admin"
      apiRoot={api.root}
      apiPrefix="/api/admin"
      onSignedIn={(session) => {
        desk.remember({ sessionId: session.sessionId, name: session.name, role: "admin" }, session.persist);
        router.replace("/");
      }}
    />
  );
}
