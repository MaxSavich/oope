# Product Badges block

Renders a dynamic promotional badge strip on the Product Display Page (PDP):
**New**, **Best Seller**, **Limited Offer**.

## How it works
- Subscribes to the PDP drop-in `pdp/data` event on the event bus to receive
  product context (`sku`, price, etc.) — no extra fetch on the storefront in Week 2.
- Renders a badge strip based on `computeBadges(product)`.

## Placement
Add a `product-badges` block to the PDP document (DA.live) where badges should appear.
Because it reads product context from the event bus, it works anywhere on the PDP.

## Capstone roadmap
| Week | Change |
|------|--------|
| 2 | Static / product-derived badges (this version). Settles UI + styling. |
| 3 | Replace `computeBadges()` with backend data via API Mesh (App Builder action, keyed by SKU). |
| 4 | Badge state recomputed on catalog events (I/O Events consumer). |
| 5 | Badge rules configured by merchants via Admin UI SDK. |

## Badge logic (Week 2)
- `New` — static placeholder (future: `created_at` within N days)
- `Limited Offer` — derived from a real discount (final price < regular price)
- `Best Seller` — static placeholder (future: ordered-quantity threshold)
