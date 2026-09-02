// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { type GenerativeBlockProps, UnknownBlock } from "web-shared";
import type {
  CheckoutPayload,
  ComparisonPayload,
  GuidePayload,
  OrderStatusPayload,
  PlanPayload,
  Product,
  ProductsPayload,
} from "@/lib/types";
import HireCheckout from "./HireCheckout";
import MachineCarousel from "./MachineCarousel";

export default function GenerativeBlock({
  block,
  status,
  onPick,
}: GenerativeBlockProps & { onPick?: (product: Product) => void }) {
  const partial = status !== "final";
  switch (block.component) {
    case "products":
      return <MachineCarousel payload={block.payload as ProductsPayload} onPick={onPick} />;
    case "comparison":
    case "plan":
    case "guide": {
      const payload = block.payload as ComparisonPayload | PlanPayload | GuidePayload;
      return (
        <section className="rounded-2xl border border-(--line) bg-white p-4 text-[14px] text-(--navy)">
          <h3 className="font-bold">{"title" in payload ? payload.title : "Details"}</h3>
        </section>
      );
    }
    case "order_status":
      if (partial) return null;
      return (
        <section className="rounded-2xl border border-(--line) bg-white p-4">
          <h3 className="font-bold text-(--navy)">{(block.payload as OrderStatusPayload).order_id}</h3>
          <p className="text-[14px] text-(--ink-2)">{(block.payload as OrderStatusPayload).summary}</p>
        </section>
      );
    case "checkout":
      if (partial) return null;
      return <HireCheckout payload={block.payload as CheckoutPayload} />;
    default:
      return partial ? null : <UnknownBlock component={block.component} />;
  }
}
