// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginScreen, useDeskSession } from "web-shared";
import { agentApi } from "@/lib/agent-api";

export default function AgentLoginPage() {
  const router = useRouter();
  const desk = useDeskSession(agentApi, "agent");

  useEffect(() => {
    if (desk.ready && desk.sessionId) router.replace("/agent");
  }, [desk.ready, desk.sessionId, router]);

  return (
    <LoginScreen
      role="agent"
      apiRoot={agentApi.root}
      apiPrefix="/api/agent"
      onSignedIn={(session) => {
        desk.remember({ sessionId: session.sessionId, name: session.name, role: "agent" }, session.persist);
        router.replace("/agent");
      }}
    />
  );
}
