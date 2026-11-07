/**
 * Admin-chosen display order for projects and properties ("which one comes first on the site").
 *
 * Each record can carry an optional `sortOrder` number — smaller = earlier. Anything WITHOUT one (everything that
 * existed before this feature, and every new item) simply follows after the ordered ones, in its previous order, so
 * turning this on never reshuffles a site that hasn't used it. No "server-only": the public sort comparators (client
 * components) and the admin actions both import it.
 */
export interface Orderable {
  sortOrder?: number;
}

/** Position used for sorting: items with no order go last. */
export function orderKey(item: Orderable): number {
  return typeof item.sortOrder === "number" ? item.sortOrder : Number.POSITIVE_INFINITY;
}

/** Stable: items with the same (or no) order keep their incoming order. */
export function sortByOrder<T extends Orderable>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const diff = orderKey(a.item) - orderKey(b.item);
      if (diff !== 0 && !Number.isNaN(diff)) return diff;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/** For a `.sort()` comparator: negative when `a` should come first. Equal / both-unordered returns 0. */
export function compareByOrder(a: Orderable, b: Orderable): number {
  const ka = orderKey(a);
  const kb = orderKey(b);
  if (ka === kb) return 0;
  return ka < kb ? -1 : 1;
}

export type MoveDirection = "up" | "down" | "top";

/**
 * Works out the new `sortOrder` values after moving `id` within `ids` (the current display order of the items being
 * reordered together — all projects, or one project's units). Returns only the entries whose number changed, so an
 * untouched list costs no writes. Numbers are renumbered 10, 20, 30 … so there is always room to slot something in.
 */
export function computeMove(ids: string[], currentOrders: Map<string, number | undefined>, id: string, direction: MoveDirection): Map<string, number> {
  const from = ids.indexOf(id);
  if (from < 0) return new Map();

  const next = [...ids];
  next.splice(from, 1);
  const to = direction === "top" ? 0 : direction === "up" ? Math.max(0, from - 1) : Math.min(ids.length - 1, from + 1);
  next.splice(to, 0, id);

  const changes = new Map<string, number>();
  next.forEach((itemId, index) => {
    const value = (index + 1) * 10;
    if (currentOrders.get(itemId) !== value) changes.set(itemId, value);
  });
  return changes;
}
