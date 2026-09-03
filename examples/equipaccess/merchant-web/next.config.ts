// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["web-shared"],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? {
        output: "standalone" as const,
        outputFileTracingRoot: path.join(__dirname, "../.."),
      }
    : {}),
};

export default nextConfig;
