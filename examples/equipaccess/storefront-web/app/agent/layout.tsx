// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EquipAccess Agent",
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
