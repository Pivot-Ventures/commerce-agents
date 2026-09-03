# ACME Equip (equipaccess)

Hire-first construction equipment in Uganda: a storefront for site managers, a merchant
portal for the yard operator, and a thin admin host for listing review. Both commerce
agents run over one fixture catalog. Checkout and payouts are handoffs — nothing charges a
card and the model cannot move money.

The public name on the mockups is EquipAccess. Brands, machines, yards, and people here
are ACME fiction.

## Run

```bash
python scripts/run_demo.py equipaccess --all    # API :8004 + storefront :3004 + portal :3104 + admin :3204
python scripts/run_demo.py equipaccess           # API + storefront
python scripts/run_demo.py equipaccess --merchant
python scripts/run_demo.py equipaccess --admin
```

Or start the pieces yourself, after `npm ci` in `examples/`:

```bash
uvicorn equipaccess.api.main:app --app-dir examples --reload --port 8004
(cd examples/equipaccess/storefront-web && npm run dev)   # :3004
(cd examples/equipaccess/merchant-web && npm run dev)     # :3104
(cd examples/equipaccess/admin-web && npm run dev)        # :3204
```

Chat needs `ANTHROPIC_API_KEY` in the repo-root `.env` or the environment; browsing the
catalog, the haulage queue, and admin listings do not. The demo defaults to fixtures.
Set `EQUIPACCESS_API_BASE` (and optionally `EQUIPACCESS_API_TOKEN`) to point the HTTP
adapter at a running Laravel app. Cart writes and `POST make-order-payment` stay unwired.

## Morning test journey

Customer A — signed-in site manager (Amina, Mukono):

1. Open the storefront (`:3004`). Ask: "Need a 20-ton excavator in Mukono for 10 days, include transport to site."
2. See the machine carousel. Pick the ACME Iron 20-ton (the CAT 320 stand-in). The live hire summary shows the dated quote and haulage.
3. Switch Daily vs Weekly. Ten days on the weekly rate is 1,260,000 UGX. Haulage Mukono → Mukono is 240,000 UGX one-way (method price × km). The refundable deposit equals that one-way amount. Host checkout later charges to+from.
4. Add to hire cart. Open Cart and Request this hire. Confirm the note: no charge. Payment options are Flutterwave (card or mobile money) and bank transfer — both handoffs. The hire lands in Haulage Review.

Customer B — date conflict / on-hire machine:

5. In a fresh ask: "The Entebbe dump truck — is it free this week?" The ACME Haul dump is on hire. The assistant offers the Jinja 10-wheeler as the substitute.

Customer C — spare parts (buy, not rent):

6. Ask: "I need hydraulic hoses for an ACME Iron excavator." The hose kit is a sale SKU, not a hire.

Merchant operator (Mercy N., ACME Plant Hire — Mukono) — portal `:3104`:

7. The default view is the haulage review queue. Seed rows include HIRE-7821 (Mukono → Kampala Industrial Park, 240k UGX) plus three more. Customer A's hire lands here after Request this hire.
8. Open a row with Review. The drawer shows the yard-to-site route, the agent proposal, **Approve haulage** and **Counter with different rate**. Nothing charges.
9. Hire calendar (and the queue strip) shows units on hire vs free. Listings, Rates, and Inventory stay wired. On Rates, ask the assistant to stage a daily-rate move. Apply only from the preview card — do not auto-apply.

Admin (BTIC · Super admin) — desk `:3204`:

10. The default view is Listing approvals (Pending / Approved / Rejected). Approve publishes; reject leaves the listing unpublished.
11. Stores, haulage Agents, Haulage desk (attach agent), Payouts (GET only; Attempt pay is 403), Shipping, and Roles stay wired. The host does not move money.

## What is specific to this example

- `api/rates.py`: daily / weekly / monthly period math. One-way haulage is method
  price × distance; deposit equals that one-way fee; to+from is a later checkout
  charge, not an assistant write.
- `api/mock_equipaccess.py`: `MockEquipAccess`, the `StorefrontBackend`. Dated search
  results are hire quotes. A first `add_to_cart` on a rental holds those dates against
  stock. `request_hire` stages a haulage-review row and charges nothing.
  `checkout_handoff` returns a Flutterwave hosted-pay URL. The model never posts payment.
- `api/http_adapter.py`: env-gated Laravel client. Reads only. Cart writes raise; payment
  is not called.
- `api/mock_merchant.py`: `MockEquipMerchant`. A price update moves the daily rate. A
  promotion is a date-window override. `hire_calendar` feeds the portal widget.
- `api/merchant.py`: portal router plus host-only haulage approve/counter.
- `api/admin.py`: listing approve/reject, stores, agents, customers, payouts (GET only;
  `POST /payouts/{id}/pay` is 403), shipping, roles.
- `api/agent_config.py`: hire-first `domain_search_notes`; merchant price fields include
  daily/weekly/monthly rates.
- `storefront-web/`, `merchant-web/`, `admin-web/`: navy `#0B1F3A`, amber `#F5A623`,
  cream `#F7F4EE`, UGX, Uganda yards.

## Laravel facts the fixtures honour

Live EquipAccess (private Laravel) is admin/store/agent Blade only. These web apps are the
customer, store, and admin UIs. The demo runs offline on fixtures. `equipaccess.com` is not
used.

- Payments: Flutterwave v3 hosted checkout in UGX (card + mobile money). Bank transfer is a
  manual receipt. Stripe is unused. The model never places the order or charges.
- Haulage: one-way = method price × distance; deposit = one-way; to+from = 2×. Distance on
  the hire puts it in Haulage Review. `POST /api/haulage` is a stub and is not called.
  Fixtures implement haulage as `get_fulfillment_options` plus cart meta.
- Agents are haulage/logistics (`packing_yard`, `transport_means`), not sales. Admin
  attaches an agent on the haulage desk. Pay shipping and pay payouts are 403.
- Business units: equipments, spare-parts, construction-materials. Each product is one
  sellable row (no parent-family SKU matrix). `listing_type` is Sale or Rent.
- Laravel rent stock is always qty 1. This demo still does date-aware multi-unit holds so
  morning overlap tests work.
- Sale stock starts at 0 until inventory CRUD. Spare parts here have been inventoried.
- Publish pipeline: store creates status New → admin approve/reject → `published`.
- Laravel has no text search (Scout is commented out). Fixture search is local: machine
  class, location, dates, listing_type.
- Live `GET /api/rentals/rate` converts a weekly/monthly list price to daily × days.
  Fixture quotes use whole weeks/months (`api/rates.py` `quote_hire`).
- Four desks: customer, store (merchant portal), haulage agent (admin haulage desk — not
  a fourth AI agent), admin. Customer JWT / store-agent-admin session on the live app;
  this demo uses host session headers.

## Laravel → StorefrontBackend (left for the HTTP adapter)

| Laravel | Method | Adapter status |
|---|---|---|
| GET equipments / spare-parts / construction-materials | `search_products` (browse, local filter; no Algolia) | read mapped |
| resource products | `get_product_details` | read mapped |
| resource cart | `get_cart` | read mapped; writes raise |
| GET rentals/rate | live: list price as daily × days | fixtures keep period math |
| GET shipping/options | `get_fulfillment_options` | read mapped; POST `/api/haulage` is a stub and is not called |
| resource orders | `get_orders`, `get_order` | read mapped |
| customer login | host session | token header only |
| POST make-order-payment | not called | Flutterwave hosted-pay handoff |

Search must not assume live Algolia. Cart quantity must not exceed `Product.stock`.
Orders that include distance stay in Haulage Review until a person at the yard approves
or counters.

## Data

`data/catalog.json`, `users.json`, `orders.json`, `policies.json`, `memory-seed.json`,
`bookings.json`, and `hires.json` feed the storefront. `merchant_metrics.json`,
`merchant_campaigns.json`, `merchant_messages.json`, `merchant_inventory.json`, and
`merchant_calendar.json` feed the portal. `admin.json` feeds the admin host.

## Ports

API `:8004`, storefront `:3004`, merchant portal `:3104`, admin `:3204`.
