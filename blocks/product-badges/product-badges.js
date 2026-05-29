import { events } from '@dropins/tools/event-bus.js';

/**
 * Product Badges
 *
 * Week 2 (Capstone): static / product-derived badge strip on the PDP.
 * Exposes reusable `computeBadges` / `renderBadges` helpers (imported by the
 * product-details block) AND works as a standalone block via the default export.
 *
 * Subscribes to the PDP drop-in `pdp/data` event to receive product context
 * (sku, price, etc.).
 *
 * Week 3+ will replace `computeBadges()` with a backend-driven source
 * (App Builder action via API Mesh, keyed by SKU).
 */

// Badge definitions — label + modifier class for styling.
export const BADGE_DEFS = {
  new: { label: 'New', modifier: 'product-badges__badge--new' },
  bestseller: { label: 'Best Seller', modifier: 'product-badges__badge--bestseller' },
  limited: { label: 'Limited Offer', modifier: 'product-badges__badge--limited' },
};

/**
 * Week 2 placeholder badge logic — derived client-side from product data
 * already available on the PDP. This settles UI location + styling.
 *
 * @param {object} product - product payload from `pdp/data`
 * @returns {string[]} badge type keys
 */
export function computeBadges(product) {
  const badges = [];

  // NEW — static placeholder for now (future: created_at within N days).
  badges.push('new');

  // LIMITED OFFER — derived from a real discount on the product.
  const range = product?.priceRange?.minimum?.final?.amount?.value;
  const regular = product?.priceRange?.minimum?.regular?.amount?.value
    ?? product?.price?.regular?.amount?.value;
  const final = product?.price?.final?.amount?.value ?? range;
  if (regular != null && final != null && final < regular) {
    badges.push('limited');
  }

  // BEST SELLER — static placeholder for now (future: ordered_qty threshold).
  badges.push('bestseller');

  return badges;
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
 * Reads product context from the event bus and renders the strip.
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
    renderBadges(container, computeBadges(product));
  }, { eager: true });
}
