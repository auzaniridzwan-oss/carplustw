/**
 * Client-backed REST profile fetch via Vercel proxy (`/api/braze/user-data`).
 */
export const BrazeRestManager = {
  _cache: /** @type {{ id: string, at: number, data: unknown } | null} */ (null),
  TTL_MS: 30_000,

  /**
   * @param {string} externalId
   * @returns {string}
   */
  normalizeExternalId(externalId) {
    return String(externalId || '').trim();
  },

  /**
   * @param {unknown} body
   * @returns {boolean}
   */
  isEmptyUserExport(body) {
    if (!body || typeof body !== 'object' || !('users' in body)) return true;
    const users = /** @type {{ users?: unknown[] }} */ (body).users;
    return !Array.isArray(users) || users.length === 0;
  },

  /**
   * @param {string} externalId
   * @returns {void}
   */
  clearCacheFor(externalId) {
    const normalized = this.normalizeExternalId(externalId);
    if (!normalized) return;
    if (this._cache?.id === normalized) {
      this._cache = null;
    }
  },

  /**
   * @param {string} externalId
   * @returns {Promise<unknown>}
   */
  async fetchUserProfile(externalId) {
    if (!externalId || typeof externalId !== 'string') {
      throw new Error('external_id required');
    }
    const normalizedId = this.normalizeExternalId(externalId);
    if (!normalizedId) {
      throw new Error('external_id required');
    }
    const now = Date.now();
    if (this._cache && this._cache.id === normalizedId && now - this._cache.at < this.TTL_MS) {
      return this._cache.data;
    }

    const url = `/api/braze/user-data?id=${encodeURIComponent(normalizedId)}`;
    const res = await fetch(url, { method: 'GET' });
    if (res.status === 429) {
      throw new Error('Rate limited — try later');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    this._cache = { id: normalizedId, at: now, data };
    return data;
  },

  /**
   * @param {string} externalId
   * @returns {Promise<Record<string, unknown>>}
   */
  getLatestAttributes(externalId) {
    return this.fetchUserProfile(externalId).then((body) => {
      if (body && typeof body === 'object' && 'users' in body) {
        const users = /** @type {{ users?: unknown[] }} */ (body).users;
        const u = Array.isArray(users) ? users[0] : null;
        if (u && typeof u === 'object' && 'custom_attributes' in u) {
          return /** @type {Record<string, unknown>} */ (
            /** @type {{ custom_attributes?: Record<string, unknown> }} */ (u).custom_attributes || {}
          );
        }
      }
      return {};
    });
  },
};
