import { events } from '@dropins/tools/event-bus.js';

/**
 * Product Badges (Capstone)
 *
 * Week 3: badges are sourced from the backend via API Mesh
 * (`Badges_getProductBadges(sku)`), which reads badge state computed by the
 * `compute-badges` App Builder action and stored in I/O State, keyed by SKU.
 *
 * `computeBadges()` (client-side derivation from PDP data) is retained as a
 * graceful fallback when the mesh is unreachable, so the strip never breaks.
 *
 * Exposes reusable helpers (`fetchBadges`, `resolveBadges`, `renderBadges`)
 * imported by the product-details block, and works standalone via the default
 * export.
 */

const MESH_ENDPOINT = 'https://edge-sandbox-graph.adobe.io/api/25cf29b4-8257-448b-ae66-4103130c6df9/graphql';

// Badge definitions — default label + modifier class for styling. Labels here
// are fallbacks; the merchant-configured labels live in the badge rules and are
// reflected in the computed badge keys. Keys must match compute-badges output:
// new, bestseller, limited, outofstock, lastone, lowstock.
export const BADGE_DEFS = {
  new: { label: 'New', modifier: 'product-badges__badge--new' },
  bestseller: { label: 'Best Seller', modifier: 'product-badges__badge--bestseller' },
  limited: { label: 'Limited Offer', modifier: 'product-badges__badge--limited' },
  outofstock: { label: 'Out of Stock', modifier: 'product-badges__badge--outofstock' },
  lastone: { label: 'Last One', modifier: 'product-badges__badge--lastone' },
  lowstock: { label: 'Low Stock', modifier: 'product-badges__badge--lowstock' },
};

/**
 * Fetch backend-computed badge keys for a SKU via API Mesh.
 * @param {string} sku
 * @returns {Promise<string[]>} badge type keys (e.g. ['new','limited'])
 */
export async function fetchBadges(sku) {
  const query = `
    query GetProductBadges($sku: String!) {
      Badges_getProductBadges(sku: $sku) {
        sku
        badges
        updatedAt
      }
    }
  `;

  const response = await fetch(MESH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { sku } }),
  });

  if (!response.ok) {
    throw new Error(`Mesh request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }

  const badges = payload.data?.Badges_getProductBadges?.badges;
  return Array.isArray(badges) ? badges : [];
}

/**
 * Client-side fallback badge logic — derived from product data already on the
 * PDP. Used only when the mesh call fails so the strip degrades gracefully.
 *
 * @param {object} product - product payload from `pdp/data`
 * @returns {string[]} badge type keys
 */
export function computeBadges(product) {
  const badges = [];

  // NEW — fallback assumes new when no backend data.
  badges.push('new');

  // LIMITED OFFER — derived from a real discount on the product.
  const range = product?.priceRange?.minimum?.final?.amount?.value;
  const regular = product?.priceRange?.minimum?.regular?.amount?.value
    ?? product?.price?.regular?.amount?.value;
  const final = product?.price?.final?.amount?.value ?? range;
  if (regular != null && final != null && final < regular) {
    badges.push('limited');
  }

  return badges;
}

/**
 * Resolve badge keys for a product: backend (mesh) first, client-side fallback
 * on any error. Always returns an array (possibly empty).
 *
 * @param {object} product - product payload from `pdp/data`
 * @returns {Promise<string[]>}
 */
export async function resolveBadges(product) {
  const sku = product?.sku;
  if (!sku) return [];
  try {
    return await fetchBadges(sku);
  } catch (error) {
    console.warn('product-badges: mesh fetch failed, using fallback', error);
    return computeBadges(product);
  }
}

/**
 * Render a badge strip into the given container.
 * @param {HTMLElement} container
 * @param {string[]} badgeKeys
 */
export function renderBadges(container, badgeKeys) {
  container.replaceChildren();

  if (!badgeKeys?.length) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  const strip = document.createElement('div');
  strip.className = 'product-badges__strip';

  badgeKeys.forEach((key) => {
    const def = BADGE_DEFS[key];
    if (!def) return;
    const badge = document.createElement('span');
    badge.className = `product-badges__badge ${def.modifier}`;
    badge.textContent = def.label;
    badge.dataset.badgeType = key;
    strip.appendChild(badge);
  });

  container.appendChild(strip);
}

/**
 * Standalone block usage: place a `product-badges` block in a document.
 * Reads product context from the event bus and renders the strip from the
 * backend badge source (mesh), falling back to client-side derivation.
 */
export default function decorate(block) {
  block.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'product-badges__container';
  container.hidden = true;
  block.appendChild(container);

  events.on('pdp/data', (product) => {
    if (!product?.sku) {
      container.hidden = true;
      return;
    }
    resolveBadges(product).then((keys) => renderBadges(container, keys));
  }, { eager: true });
}
