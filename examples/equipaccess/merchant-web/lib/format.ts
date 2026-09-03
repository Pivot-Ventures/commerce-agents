// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

const ugx = new Intl.NumberFormat("en-UG");

export function formatUgx(value: number, compact = false): string {
  if (compact && value >= 1000) return `${ugx.format(Math.round(value / 1000))}k UGX`;
  return `${ugx.format(Math.round(value))} UGX`;
}
