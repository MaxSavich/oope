import { events } from '@dropins/tools/event-bus.js';

/**
 * Product Badges (Capstone — v3 dynamic badges)
 *
 * Badges are sourced from the backend via API Mesh (`Badges_getProductBadges`),
 * which returns badge IDs computed by the `get-badges` App Builder action
 * (lazy-pull model: computed on first PDP visit, cached in I/O State, auto-
 * invalidated when rules change or the product is saved).
 *
 * Badge IDs are resolved to { label, style } by fetching `get-rules` once
 * per page load (module-level cache). The `style` value is the full CSS class
 * name the merchant configured in the Admin UI (e.g. `product_badge_sale`).
 * Developers add matching rules to product-badges.css.
 */

const MESH_ENDPOINT = 'https://edge-sandbox-graph.adobe.io/api/25cf29b4-8257-448b-ae66-4103130c6df9/graphql';
const GET_RULES_URL = 'https://3967933-471blackyak-stage.adobeioruntime.net/api/v1/web/capstone-badge/get-rules';

// Module-level rules cache — fetched once per page load, shared across all
// block instances (there is typically one per PDP but this is safe either way).
let rulesCache = null; // Map<id, { label, style }>
let rulesFetchPromise = null;

async function fetchRulesMap() {
  if (rulesCache) return rulesCache;
  if (rulesFetchPromise) return rulesFetchPromise;

  rulesFetchPromise = (async () => {
    try {
      const res = await fetch(GET_RULES_URL, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(`get-rules returned ${res.status}`);
      const data = await res.json();
      const map = (data.rules?.badgeList || []).reduce((m, badge) => {
        m.set(badge.id, { label: badge.label, style: badge.style });
        return m;
      }, new Map());
      rulesCache = map;
      return map;
    } catch (err) {
      console.warn('product-badges: could not fetch badge rules, falling back to IDs as labels', err);
      return new Map();
    }
  })();

  return rulesFetchPromise;
}

/**
 * Fetch backend badge IDs for a SKU via API Mesh.
 * @param {string} sku
 * @returns {Promise<string[]>} badge IDs (e.g. ['new_1', 'lowstock_1'])
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

  if (!response.ok) throw new Error(`Mesh request failed: ${response.status}`);

  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join('; '));

  const badges = payload.data?.Badges_getProductBadges?.badges;
  return Array.isArray(badges) ? badges : [];
}

/**
 * Client-side fallback — used only when the mesh is unreachable.
 * Returns a minimal set of synthetic badge IDs so the strip degrades gracefully.
 */
export function computeBadgesFallback(product) {
  const ids = ['new_1'];
  const regular = product?.priceRange?.minimum?.regular?.amount?.value
    ?? product?.price?.regular?.amount?.value;
  const final = product?.price?.final?.amount?.value
    ?? product?.priceRange?.minimum?.final?.amount?.value;
  if (regular != null && final != null && final < regular) ids.push('limited_1');
  return ids;
}

/**
 * Resolve badge IDs for a product: backend (mesh) first, fallback on error.
 */
export async function resolveBadges(product) {
  const sku = product?.sku;
  if (!sku) return [];
  try {
    return await fetchBadges(sku);
  } catch (err) {
    console.warn('product-badges: mesh fetch failed, using fallback', err);
    return computeBadgesFallback(product);
  }
}

/**
 * Render a badge strip into the given container.
 * @param {HTMLElement} container
 * @param {string[]} badgeIds   - IDs from get-badges (e.g. ['new_1', 'limited_1'])
 * @param {Map}      rulesMap   - id -> { label, style } from get-rules
 */
export function renderBadges(container, badgeIds, rulesMap) {
  container.replaceChildren();

  const validIds = (badgeIds || []).filter((id) => id);
  if (!validIds.length) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  const strip = document.createElement('div');
  strip.className = 'product-badges__strip';

  validIds.forEach((id) => {
    const def = rulesMap.get(id);
    // Graceful fallback: if the rules map doesn't have this ID yet (e.g. rules
    // changed and the cache hasn't refreshed), render the raw ID as the label
    // with the default style.
    const label = def?.label || id;
    const style = def?.style || 'product_badge_default';

    const badge = document.createElement('span');
    badge.className = `product-badges__badge ${style}`;
    badge.textContent = label;
    badge.dataset.badgeId = id;
    strip.appendChild(badge);
  });

  container.appendChild(strip);
}

/**
 * Standalone block entry point.
 */
export default function decorate(block) {
  block.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'product-badges__container';
  container.hidden = true;
  block.appendChild(container);

  events.on('pdp/data', async (product) => {
    if (!product?.sku) {
      container.hidden = true;
      return;
    }

    // Fetch rules map and badge IDs in parallel — both are needed to render.
    const [rulesMap, badgeIds] = await Promise.all([
      fetchRulesMap(),
      resolveBadges(product),
    ]);

    renderBadges(container, badgeIds, rulesMap);
  }, { eager: true });
}
