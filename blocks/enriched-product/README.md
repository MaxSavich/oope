# Enriched Product block

Displays a single product enriched with custom data sourced through **API Mesh**:
catalog fields (name, SKU, price, image) from Adobe Commerce plus enrichment
fields (sustainability score, estimated delivery, enriched-at timestamp) from a
custom **product-enrichment** App Builder action.

## How it works
- Reads the `sku` from the block config (authored in DA.live).
- Issues one GraphQL query to the API Mesh endpoint (`MESH_ENDPOINT`) that joins:
  - `products(skus: [...])` — Commerce catalog source
  - `Enrichment_getProductEnrichment(sku: ...)` — custom OpenAPI source (prefixed `Enrichment_`)
- Renders a product card; the enrichment section appears only when enrichment data is returned.

## Configuration
| Block key | Purpose |
|-----------|---------|
| `sku` | Product SKU to fetch and enrich |

`MESH_ENDPOINT` (top of `enriched-product.js`) must point at your mesh:
`aio api-mesh get` → `https://edge-sandbox-graph.adobe.io/api/<mesh-id>/graphql`.

## Requirements
- Deployed `product-enrichment` App Builder action (Activity 3-1).
- Created/updated API Mesh joining Commerce + Enrichment (Activity 3-2).
- Mesh CORS must allow the storefront origin(s) (page, live, localhost) or the
  browser fetch is blocked.

## Error / empty states
- No SKU configured → "No SKU configured for this block."
- No product returned → "Product not found."
- Fetch/GraphQL error → "Unable to load product data." (details in console)

## Source
Adapted from course Activity 3-3. Not part of the Capstone (PDP Badges) scope.
