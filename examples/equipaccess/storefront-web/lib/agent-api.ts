// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { AgentApi } from "web-shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004";

export const agentApi = new AgentApi(API_URL, "/api/agent");

export type AgentHire = {
  hire_id: string;
  agent_id?: string;
  status?: string;
  title?: string;
  site?: string;
  shipping_amount?: number;
  currency?: string;
};

export function fetchAgentDesk() {
  return agentApi.get<{ agent_id: string; assigned: AgentHire[]; note: string }>("/desk");
}

export function closeAgentHire(hireId: string) {
  return agentApi.post<{ ok: boolean; hire_id: string; status: string }>(
    `/hires/${encodeURIComponent(hireId)}/close`,
    {},
  );
}
