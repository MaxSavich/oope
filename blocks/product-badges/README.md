# Product Badges block

Renders a dynamic promotional badge strip on the Product Display Page (PDP):
**New**, **Best Seller**, **Limited Offer**.

## How it works
- Subscribes to the PDP drop-in `pdp/data` event on the event bus to receive
  product context (`sku`, price, etc.).
- Fetches backend-computed badges via API Mesh (`Badges_getProductBadges(sku)`),
  which reads badge state written by the `compute-badges` App Builder action and
  stored in I/O State, keyed by SKU.
- Falls back to client-side `computeBadges(product)` if the mesh is unreachable,
  so the strip degrades gracefully.

## Placement
Add a `product-badges` block to the PDP document (DA.live) where badges should appear.
Because it reads product context from the event bus, it works anywhere on the PDP.

## Capstone roadmap
| Week | Change |
|------|--------|
| 2 | Static / product-derived badges. Settled UI + styling. |
| 3 | Backend data via API Mesh (this version) — `Badges_getProductBadges(sku)`. |
| 4 | Badge state recomputed on catalog events (I/O Events consumer). |
| 5 | Badge rules configured by merchants via Admin UI SDK. |

## Badge logic (Week 3, backend)
- `New` — product `created_at` within `newWithinDays` (default 30)
- `Best Seller` — SKU in merchant-configured `bestsellerSkus[]` (State `badge-rules`)
- `Limited Offer` — active `special_price` within its date window
Fallback (mesh down): `New` always, `Limited Offer` if final price < regular price.
