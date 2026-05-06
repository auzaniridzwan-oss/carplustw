import * as braze from '@braze/web-sdk';
import { getSiaDemoRegistrationAttributes } from '../components/registrationModal.js';
import { getPersistedExternalId } from '../logic/userSession.js';
import { AppLogger } from './AppLogger.js';

export const EVENT_LOGGED = 'EVENT_LOGGED';
export const IAM_RECEIVED = 'IAM_RECEIVED';

/** 1×1 transparent GIF when IAM extras omit `iam_image`. */
const IAM_HIGHLIGHT_PLACEHOLDER_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/**
 * Builds a highlights row from IAM `messageExtras` (`Record<string, string>` per Braze InAppMessage).
 * @param {Record<string, string>} extras
 * @returns {import('../components/highlightsSection.js').HighlightPromo | null}
 */
function buildIamHighlightPromo(extras) {
  const img = extras.iam_image ? String(extras.iam_image).trim() : '';
  const rawTitle = extras.iam_title ? String(extras.iam_title).trim() : '';
  const desc = extras.iam_message ? String(extras.iam_message).trim() : '';
  if (!img && !rawTitle && !desc) return null;
  const title = rawTitle || 'Offer';
  const id = `iam-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    title,
    description: desc,
    imageUrl: img || IAM_HIGHLIGHT_PLACEHOLDER_IMAGE,
    imageAlt: '',
    source: 'iam',
    expiresAt: null,
  };
}

/**
 * Singleton-style Braze wrapper: init, user, logging, and pub/sub for overlays.
 */
class BrazeManagerClass {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    this._initialized = false;
  }

  /**
   * Logs successful Braze SDK method execution with consistent shape.
   * @param {string} method
   * @param {Record<string, unknown>} [data]
   * @param {'[SDK]'|'[AUTH]'} [category]
   * @returns {void}
   */
  logSdkSuccess(method, data = {}, category = '[SDK]') {
    AppLogger.info(category, `Braze SDK call succeeded: ${method}`, data);
  }

  /**
   * @param {string} externalId
   * @returns {string}
   */
  maskExternalId(externalId) {
    if (!externalId) return '';
    const id = String(externalId);
    if (id.length <= 3) return `${id[0] ?? ''}***`;
    return `${id.slice(0, 3)}***`;
  }

  /**
   * @param {string} eventType
   * @param {Function} callback
   * @returns {() => void}
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
      }
    };
  }

  /**
   * @param {string} eventType
   * @param {unknown} payload
   * @returns {void}
   */
  notify(eventType, payload) {
    const set = this.listeners.get(eventType);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        AppLogger.warn('[SDK]', 'BrazeManager listener error', e);
      }
    });
  }

  /**
   * @param {string} apiKey
   * @param {string} baseUrl - SDK endpoint host, e.g. sdk.iad-03.braze.com
   * @returns {boolean}
   */
  initialize(apiKey, baseUrl) {
    if (!apiKey || !baseUrl) {
      AppLogger.warn('[SDK]', 'Braze init skipped — missing VITE_BRAZE_SDK_KEY or VITE_BRAZE_SDK_URL');
      return false;
    }
    try {
      const ok = braze.initialize(apiKey, {
        baseUrl,
        enableLogging: Boolean(import.meta.env.DEV),
        noCookies: false,
      });
      this._initialized = ok;
      if (ok) {
        this.logSdkSuccess('initialize', { baseUrl });

        this.configIAM();
        AppLogger.info('[SDK]', 'Braze Web SDK initialized', { baseUrl });
      } else {
        AppLogger.warn(
          '[SDK]',
          'Braze initialize returned false — verify Web SDK key and sdk.<cluster>.braze.com match your Braze app; check user opt-out or crawler blocking',
          { baseUrl },
        );
      }
      return ok;
    } catch (e) {
      this._initialized = false;
      AppLogger.warn('[SDK]', 'Braze initialize failed', e);
      return false;
    }
  }

  configIAM() {
    braze.automaticallyShowInAppMessages();
    this.logSdkSuccess('automaticallyShowInAppMessages');
    try {
      braze.subscribeToInAppMessage((inAppMessage) => {
        this.logSdkSuccess('subscribeToInAppMessage.callback');
        braze.showInAppMessage(inAppMessage);
        this.logSdkSuccess('showInAppMessage', {
          hasExtras: !!inAppMessage?.extras && typeof inAppMessage.extras === 'object',
        });

        AppLogger.info('[SDK]', 'Getting InAppMessage Extras ', inAppMessage.extras);

        const iamExtras = inAppMessage.extras;
        if (!iamExtras || typeof iamExtras !== 'object') return;

        AppLogger.info('[SDK]', 'Building IAM Highlight Promo');

        const promo = buildIamHighlightPromo(
          /** @type {Record<string, string>} */(iamExtras),
        );

        if (!promo) return;
        AppLogger.info('[SDK]', 'Built IAM Highlight Promo', promo);

        this.notify(IAM_RECEIVED, { promo, at: Date.now() });
        AppLogger.info('[SDK]', 'InAppMessage received', inAppMessage.message);
      });
      this.logSdkSuccess('subscribeToInAppMessage');
    } catch (e) {
      AppLogger.debug('[SDK]', 'subscribeToInAppMessage unavailable', e);
    }
  }

  /**
   * @param {string} externalId
   * @returns {void}
   */
  login(externalId) {
    try {
      if (typeof braze.changeUser === 'function') {
        braze.changeUser(externalId);
        const externalIdPreview = this.maskExternalId(externalId);
        this.logSdkSuccess('changeUser', { externalIdPreview }, '[AUTH]');
      }
      braze.openSession();
      const externalIdPreview = this.maskExternalId(externalId);
      this.logSdkSuccess('openSession', { externalIdPreview }, '[AUTH]');
      AppLogger.info('[AUTH]', 'Braze login / session opened', { externalIdPreview });
    } catch (e) {
      AppLogger.warn('[AUTH]', 'Braze login failed', e);
    }
  }

  /**
   * Clears Braze SDK persisted identity and device data for this origin (e.g. debug full reset).
   * @returns {void}
   */
  wipeLocalSdkData() {
    try {
      if (typeof braze.wipeData === 'function') {
        braze.wipeData();
        this.logSdkSuccess('wipeData');
      }
    } catch (e) {
      AppLogger.warn('[SDK]', 'Braze wipeData failed', e);
    }
  }

  /**
   * @param {string} key
   * @param {string|number|boolean} value
   * @returns {void}
   */
  setCustomAttribute(key, value) {
    try {
      const user = braze.getUser?.();
      if (user) {
        this.logSdkSuccess('getUser', { found: true, purpose: 'setCustomAttribute' });
      }
      if (typeof user?.setCustomUserAttribute === 'function') {
        user.setCustomUserAttribute(key, value);
        this.logSdkSuccess('setCustomUserAttribute', { key });
      }
    } catch (e) {
      AppLogger.warn('[SDK]', 'setCustomAttribute failed', e);
    }
  }

  /**
   * Sends queued SDK data to Braze immediately (e.g. after profile or search attributes).
   * @returns {void}
   */
  requestImmediateDataFlush() {
    try {
      if (typeof braze.requestImmediateDataFlush === 'function') {
        braze.requestImmediateDataFlush();
        this.logSdkSuccess('requestImmediateDataFlush');
      }
    } catch (e) {
      AppLogger.warn('[SDK]', 'requestImmediateDataFlush failed', e);
    }
  }

  /**
   * @param {string} name
   * @param {Record<string, unknown>} [props]
   * @returns {void}
   */
  logCustomEvent(name, props) {
    try {
      if (typeof braze.logCustomEvent === 'function') {
        braze.logCustomEvent(name, props);
        this.logSdkSuccess('logCustomEvent', { name });
      }
    } catch (e) {
      AppLogger.warn('[SDK]', 'logCustomEvent failed', e);
    }
    this.notify(EVENT_LOGGED, { name, props });
  }

  /** @returns {Record<string, unknown>} */
  getUserData() {
    try {
      const user = braze.getUser?.();
      if (!user) return {};
      this.logSdkSuccess('getUser', { found: true, purpose: 'getUserData' });
      return {
        userId: user.getUserId?.() ?? null,
      };
    } catch {
      return {};
    }
  }

  /**
   * After SDK init: restore Braze user via `login` (changeUser + openSession) when storage has an external id;
   * otherwise opens an anonymous session so the SDK can sync with Braze (sessions / tracing).
   * Reads from `user_id` or `user_session.external_id` (see getPersistedExternalId).
   * @returns {void}
   */
  syncUserFromStorage() {
    if (!this._initialized) return;
    const id = getPersistedExternalId();
    if (id) {
      this.login(id);
      return;
    }
    try {
      braze.openSession();
      this.logSdkSuccess('openSession', { anonymous: true }, '[AUTH]');
      AppLogger.info('[AUTH]', 'Braze anonymous session opened');
    } catch (e) {
      AppLogger.warn('[AUTH]', 'Braze anonymous openSession failed', e);
    }
  }

  /**
   * @param {{ firstName: string, lastName: string, email: string, phone?: string }} profile
   * @returns {{ ok: boolean, externalId: string, error?: string }}
   */
  completeRegistration(profile) {
    const externalId = profile.email.trim().toLowerCase();
    try {
      braze.changeUser(externalId);
      const externalIdPreview = this.maskExternalId(externalId);
      this.logSdkSuccess('changeUser', { externalIdPreview }, '[AUTH]');
      braze.openSession();
      this.logSdkSuccess('openSession', { externalIdPreview }, '[AUTH]');

      const user = braze.getUser?.();
      if (user) {
        this.logSdkSuccess('getUser', { found: true, purpose: 'completeRegistration' });
        if (typeof user.setEmail === 'function') {
          user.setEmail(profile.email.trim().toLowerCase());
          this.logSdkSuccess('setEmail', { hasValue: true });
        }
        if (typeof user.setFirstName === 'function') {
          user.setFirstName(profile.firstName.trim());
          this.logSdkSuccess('setFirstName', { hasValue: true });
        }
        if (typeof user.setLastName === 'function') {
          user.setLastName(profile.lastName.trim());
          this.logSdkSuccess('setLastName', { hasValue: true });
        }
        if (profile.phone) {
          if (typeof user.setPhoneNumber === 'function') {
            user.setPhoneNumber(profile.phone);
            this.logSdkSuccess('setPhoneNumber', { hasValue: true });
          }
        }
      }

      const siaDemo = getSiaDemoRegistrationAttributes();
      for (const [key, value] of Object.entries(siaDemo)) {
        this.setCustomAttribute(key, value);
      }

      const now = new Date().toISOString();
      this.setCustomAttribute('registration_completed_at', now);
      this.setCustomAttribute('registration_source', 'flight_search_gate');

      this.logCustomEvent('Registration - Completed', {
        has_phone: !!profile.phone,
      });

      this.requestImmediateDataFlush();
      return { ok: true, externalId };
    } catch (e) {
      AppLogger.warn('[AUTH]', 'completeRegistration failed', e);
      return { ok: false, externalId, error: 'Registration failed' };
    }
  }

  /**
   * Expose for hero / IAM-driven updates.
   * @param {{ title?: string, cta?: string }} patch
   */
  broadcastContentPatch(patch) {
    this.notify('HERO_CONTENT', patch);
  }
}

export const BrazeManager = new BrazeManagerClass();
