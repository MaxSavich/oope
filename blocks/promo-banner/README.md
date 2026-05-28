# Promo Banner Block

Displays a grid of featured products fetched from the Commerce catalog, filtered by category.

## Authoring

Create a block with the name **Promo Banner** and add the following configuration rows:

| Field | Required | Description |
|---|---|---|
| `category-id` | One of these is required | Numeric category ID used to filter products |
| `url-path` | One of these is required | Category URL path (takes priority over `category-id`) |
| `heading` | No | Section heading text. Defaults to `Featured Products` |
| `max-products` | No | Maximum number of products to display. Defaults to `4` |

Example block table:

| Promo Banner | |
|---|---|
| url-path | women/tops |
| heading | Shop Women's Tops |
| max-products | 6 |

## Configuration Options

- **`url-path`** — preferred filter; maps to the `categoryPath` attribute in the GraphQL query.
- **`category-id`** — fallback filter; maps to the `categoryIds` attribute. Ignored when `url-path` is present.
- **`heading`** — rendered as an `<h2>` above the product grid.
- **`max-products`** — passed as `page_size` to the product search query.

## Integration Details

Products are fetched via `CS_FETCH_GRAPHQL.fetchGraphQl` from `scripts/commerce.js` using the `productSearch` GraphQL query. Product links are built with `getProductLink(urlKey, sku)` from the same module.

Images use `roles: ["image"]` and are rendered with `loading="lazy"` and a fixed `300×300` intrinsic size.

## Behavior

1. On decoration the block is replaced with a heading and a loading message.
2. A GraphQL query fetches up to `max-products` items for the configured category.
3. Each product is rendered as a linked card containing the product image, name, and price.
4. For `SimpleProductView` products the `price.final.amount` is displayed; for `ComplexProductView` the `priceRange.minimum.final.amount` is used.

## Error Handling

- If neither `category-id` nor `url-path` is configured, a prompt message is shown in the products area.
- If the query returns no items, a "No products found." message is shown.
- If the network request or GraphQL call fails, the error is logged to the console and "Unable to load products." is shown in the products area.
