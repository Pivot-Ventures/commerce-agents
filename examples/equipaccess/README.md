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
3. Switch Daily vs Weekly. Ten days on the weekly rate is 1,260,000 UGX; haulage Mukono → Mukono is 240,000 UGX.
4. Add to hire cart. Open Cart and Request this hire. Confirm the note: no charge. The hire lands in Haulage Review.

Customer B — date conflict / on-hire machine:

5. In a fresh ask: "The Entebbe dump truck — is it free this week?" The ACME Haul dump is on hire. The assistant offers the Jinja 10-wheeler as the substitute.

Customer C — spare parts (buy, not rent):

6. Ask: "I need hydraulic hoses for an ACME Iron excavator." The hose kit is a sale SKU, not a hire.

Merchant operator (Mercy, ACME Plant Hire — Mukono):

7. Open the portal (`:3104`). The haulage queue includes Customer A's hire (and the seed row HIRE-7821). Approve or Counter.
8. Hire calendar shows units on hire vs free for the week.
9. On Rates, ask the assistant to stage a daily-rate move. Apply only from the preview card — do not auto-apply.

Admin (BTIC super admin):

10. Open admin (`:3204`). Pending listings: Approve or Reject.
11. View Stores and Agents. Payouts are visible. Attempt Pay is refused; the host does not move money.

## What is specific to this example

- `api/rates.py`: daily / weekly / monthly period math and the distance haulage quote.
- `api/mock_equipaccess.py`: `MockEquipAccess`, the `StorefrontBackend`. Dated search
  results are hire quotes. A first `add_to_cart` on a rental holds those dates against
  stock. `request_hire` stages a haulage-review row and charges nothing.
  `checkout_handoff` returns `https://hire.acme-equip.example/checkout`.
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

## Laravel → StorefrontBackend (left for the HTTP adapter)

| Laravel | Method | Adapter status |
|---|---|---|
| GET equipments, GET scoped-products | `search_products` (hire default) | read mapped |
| GET spare-parts | `search_products` on a buy/parts query | read mapped |
| resource products | `get_product_details` | read mapped |
| resource cart | `get_cart` | read mapped; writes raise |
| GET rentals/rate | period quote inside search/cart | fixture math; live rate left |
| POST haulage, GET shipping/options | `get_fulfillment_options` | read mapped |
| resource orders | `get_orders`, `get_order` | read mapped |
| customer login | host session | token header only |
| POST make-order-payment | not called | `checkout_handoff` returns a host URL |

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
