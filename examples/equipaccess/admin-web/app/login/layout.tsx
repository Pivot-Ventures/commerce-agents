// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in · EquipAccess Admin",
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
