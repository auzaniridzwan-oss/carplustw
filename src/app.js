import { renderRentalSearch } from './components/rentalSearch.js';
import { renderCarList } from './components/carList.js';
import { renderAddonsStep } from './components/addonsStep.js';
import { renderConfirmationStep } from './components/confirmationStep.js';
import { renderPaymentStep } from './components/paymentStep.js';
import { renderThankYouStep } from './components/thankYouStep.js';
import { renderDebugOverlay, formatDebugJson } from './components/debugOverlay.js';
import { renderLoginModal } from './components/loginModal.js';
import { TAIWAN_LOCATIONS } from './data/taiwanLocations.js';
import { CARS } from './data/cars.js';
import { RENTAL_ADDONS } from './data/addons.js';
import { StorageManager } from './managers/StorageManager.js';
import { AppLogger } from './managers/AppLogger.js';
import { BrazeManager, EVENT_LOGGED } from './managers/BrazeManager.js';
import { BrazeRestManager } from './managers/BrazeRestManager.js';
import { getPersistedExternalId, persistAuthSession } from './logic/userSession.js';

const STEPS = {
  SEARCH: 'SEARCH',
  CARS: 'CARS',
  ADDONS: 'ADDONS',
  CONFIRMATION: 'CONFIRMATION',
  PAYMENT: 'PAYMENT',
  THANK_YOU: 'THANK_YOU',
};

const STORAGE_KEYS = {
  STEP: 'rental_step',
  SEARCH: 'rental_search',
  CAR: 'rental_selected_car',
  ADDONS: 'rental_addons',
  PRICING: 'rental_pricing',
  ORDER: 'rental_order',
};

/** @type {keyof typeof STEPS} */
let currentStep = STEPS.SEARCH;
let isPaymentProcessing = false;
let carouselIndex = 0;
let isDebugDrawerOpen = false;
let loginSuccessMessage = '';
let loginSuccessMessageTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

/** Max entries retained for the debug drawer custom event list. */
const CUSTOM_EVENT_LOG_MAX = 80;

/**
 * @typedef {{ pickupLocation:string,returnLocation:string,pickupDate:string,pickupTime:string,returnDate:string,returnTime:string,rentalDays:number }} RentalSearchPayload
 */

/** @type {{ name: string, props?: Record<string, unknown>, at: number }[]} */
let customEventLogBuffer = [];

/** Search validated on the form but held until login succeeds.
 * @type {RentalSearchPayload | null}
 */
let pendingRentalSearchAfterLogin = null;
let latestDebugRestProfileState = /** @type {'idle'|'loading'|'no_logged_in_user'|'profile_pending_sync'|'proxy_not_configured'|'rate_limited'|'api_error'|'profile_ready'} */ ('idle');

const REST_PROFILE_RETRY_DELAYS_MS = [1000, 2000, 4000];

/**
 * Sets a transient login success notice shown in the app shell.
 * @param {string} message
 * @returns {void}
 */
function setLoginSuccessNotice(message) {
  loginSuccessMessage = message;
  if (loginSuccessMessageTimer) {
    clearTimeout(loginSuccessMessageTimer);
  }
  loginSuccessMessageTimer = setTimeout(() => {
    loginSuccessMessage = '';
    render();
    bindStepActions();
    loginSuccessMessageTimer = null;
  }, 4000);
}

/**
 * Returns the current debug drawer element and toggle button.
 * @returns {{ drawer: HTMLElement | null, toggle: HTMLButtonElement | null }}
 */
function getDebugDrawerControls() {
  return {
    drawer: document.getElementById('debug-drawer'),
    toggle: /** @type {HTMLButtonElement | null} */ (document.getElementById('header-debug-toggle')),
  };
}

/**
 * Applies the debug drawer open/closed state to current DOM.
 * @param {boolean} open
 * @returns {void}
 */
function setDebugDrawerOpen(open) {
  isDebugDrawerOpen = open;
  const { drawer, toggle } = getDebugDrawerControls();
  if (drawer) {
    if (open) {
      drawer.classList.remove('-translate-x-full');
    } else {
      drawer.classList.add('-translate-x-full');
    }
  }
  toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/**
 * Writes JSON data into a debug `<pre>` target safely.
 * @param {'debug-sdk-user'|'debug-rest-profile'} targetId
 * @param {unknown} data
 * @returns {void}
 */
function writeDebugJson(targetId, data) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.textContent = formatDebugJson(data);
}

/**
 * Parses an unknown error into a typed debug REST state.
 * @param {unknown} error
 * @returns {{ state: 'proxy_not_configured'|'rate_limited'|'api_error', message: string }}
 */
function classifyRestError(error) {
  const message = String(error || 'Unknown error');
  if (message.includes('Braze REST proxy not configured')) {
    return { state: 'proxy_not_configured', message };
  }
  if (message.includes('Rate limited')) {
    return { state: 'rate_limited', message };
  }
  return { state: 'api_error', message };
}

/**
 * Refreshes SDK and REST profile details shown in debug overlay.
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<void>}
 */
async function refreshDebugProfile(options = {}) {
  const externalId = getPersistedExternalId();
  writeDebugJson('debug-sdk-user', {
    external_id: externalId || null,
    ...BrazeManager.getUserData(),
  });
  if (!externalId) {
    latestDebugRestProfileState = 'no_logged_in_user';
    writeDebugJson('debug-rest-profile', {
      state: latestDebugRestProfileState,
      info: 'No logged-in user found. Log in to view REST profile.',
    });
    return;
  }
  latestDebugRestProfileState = 'loading';
  writeDebugJson('debug-rest-profile', {
    state: latestDebugRestProfileState,
    info: 'Loading REST profile...',
    external_id: externalId,
  });
  if (options.force) {
    BrazeRestManager.clearCacheFor(externalId);
  }
  try {
    const data = await BrazeRestManager.fetchUserProfile(externalId);
    if (BrazeRestManager.isEmptyUserExport(data)) {
      latestDebugRestProfileState = 'profile_pending_sync';
      writeDebugJson('debug-rest-profile', {
        state: latestDebugRestProfileState,
        info: 'Profile not available yet. Braze export may still be syncing after login.',
        hint: 'Wait a few seconds and refresh again.',
        external_id: externalId,
        raw: data,
      });
      return;
    }
    latestDebugRestProfileState = 'profile_ready';
    writeDebugJson('debug-rest-profile', {
      state: latestDebugRestProfileState,
      external_id: externalId,
      data,
    });
  } catch (error) {
    const parsed = classifyRestError(error);
    latestDebugRestProfileState = parsed.state;
    writeDebugJson('debug-rest-profile', {
      external_id: externalId,
      state: latestDebugRestProfileState,
      error: parsed.message,
      hint:
        parsed.state === 'proxy_not_configured'
          ? 'Ensure /api is reachable and BRAZE_REST_API_KEY/BRAZE_REST_API_URL are configured.'
          : parsed.state === 'rate_limited'
            ? 'Retry after a short delay.'
            : 'Check API/proxy status in browser network logs.',
    });
  }
}

/**
 * Retries REST profile fetch after login because Braze export can lag briefly.
 * @param {string} externalId
 * @returns {Promise<void>}
 */
async function retryDebugRestProfileHydrationAfterLogin(externalId) {
  if (!externalId) return;
  BrazeRestManager.clearCacheFor(externalId);
  await refreshDebugProfile({ force: true });
  if (latestDebugRestProfileState !== 'profile_pending_sync') return;
  for (const delayMs of REST_PROFILE_RETRY_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await refreshDebugProfile({ force: true });
    if (latestDebugRestProfileState !== 'profile_pending_sync') {
      return;
    }
  }
}

/**
 * Performs a full debug reset back to initial app state.
 * Clears app storage, wipes local Braze SDK identity/device data, and rebuilds UI from defaults.
 * @returns {void}
 */
function resetAppFromDebug() {
  if (loginSuccessMessageTimer) {
    clearTimeout(loginSuccessMessageTimer);
    loginSuccessMessageTimer = null;
  }

  StorageManager.clearSession();
  BrazeManager.wipeLocalSdkData();
  BrazeRestManager._cache = null;

  currentStep = STEPS.SEARCH;
  isPaymentProcessing = false;
  carouselIndex = 0;
  isDebugDrawerOpen = false;
  loginSuccessMessage = '';
  latestDebugRestProfileState = 'idle';
  pendingRentalSearchAfterLogin = null;
  customEventLogBuffer = [];

  AppLogger.info('[SYSTEM]', 'Debug reset executed: app state cleared');
  render();
  bindStepActions();
}

const CAROUSEL_SLIDES = [
  {
    id: 'city-drive',
    title: 'City Drives, Zero Hassle',
    subtitle: 'Pick up in Taipei and drop off island-wide.',
    imageUrl:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'family-trip',
    title: 'Family Road Trips in Comfort',
    subtitle: 'Roomy SUVs and child-seat options for safe travel.',
    imageUrl:
      'https://images.unsplash.com/photo-1462396881884-de2c07cb95ed?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'business-ride',
    title: 'Business Travel, On Time',
    subtitle: 'Premium rentals with flexible duration and add-ons.',
    imageUrl:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80',
  },
];

const PROMOTIONAL_CARDS = [
  {
    id: 'airport-transfer',
    title: 'Airport Pickup Package',
    description: 'Fast pickup lanes at Taoyuan and Songshan with optional GPS included.',
    icon: 'fa-plane-arrival',
  },
  {
    id: 'long-term-rental',
    title: 'Long-term Rental Savings',
    description: 'Book 7+ days and unlock better daily rates for island-wide travel.',
    icon: 'fa-calendar-check',
  },
  {
    id: 'family-protection',
    title: 'Family Safety Bundle',
    description: 'Add insurance and child seats in one tap for peace of mind.',
    icon: 'fa-shield-heart',
  },
];

/**
 * @returns {{pickupLocation:string,returnLocation:string,pickupDate:string,pickupTime:string,returnDate:string,returnTime:string,rentalDays:number}|null}
 */
function getSearchState() {
  return /** @type {ReturnType<typeof getSearchState>} */ (StorageManager.get(STORAGE_KEYS.SEARCH, null));
}

/**
 * @returns {{id:string,brand:string,model:string,type:string,seats:number,mileage:number,dailyPriceTwd:number,imageUrl:string}|null}
 */
function getSelectedCarState() {
  return /** @type {ReturnType<typeof getSelectedCarState>} */ (StorageManager.get(STORAGE_KEYS.CAR, null));
}

/**
 * @returns {string[]}
 */
function getSelectedAddonIds() {
  return /** @type {string[]} */ (StorageManager.get(STORAGE_KEYS.ADDONS, []));
}

/**
 * @returns {{carTotal:number,addonsTotal:number,total:number}}
 */
function getPricingState() {
  return /** @type {{carTotal:number,addonsTotal:number,total:number}} */ (
    StorageManager.get(STORAGE_KEYS.PRICING, { carTotal: 0, addonsTotal: 0, total: 0 })
  );
}

/**
 * @returns {{bookingRef:string,total:number,pickupLocation:string,returnLocation:string,pickupDate:string,returnDate:string,carLabel:string}|null}
 */
function getOrderState() {
  return /** @type {ReturnType<typeof getOrderState>} */ (StorageManager.get(STORAGE_KEYS.ORDER, null));
}

/**
 * @param {string} dateText
 * @param {string} timeText
 * @returns {Date|null}
 */
function toDateTime(dateText, timeText) {
  if (!dateText || !timeText) return null;
  const parsed = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * @param {Date} start
 * @param {Date} end
 * @returns {number}
 */
function getRentalDays(start, end) {
  const ms = end.getTime() - start.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

/**
 * @param {{pickupLocation:string,returnLocation:string,pickupDate:string,pickupTime:string,returnDate:string,returnTime:string}} formData
 * @returns {{ok:boolean,error?:string,payload?:{pickupLocation:string,returnLocation:string,pickupDate:string,pickupTime:string,returnDate:string,returnTime:string,rentalDays:number}}}
 */
function validateSearchForm(formData) {
  if (
    !formData.pickupLocation ||
    !formData.returnLocation ||
    !formData.pickupDate ||
    !formData.pickupTime ||
    !formData.returnDate ||
    !formData.returnTime
  ) {
    return { ok: false, error: 'Please complete all required fields.' };
  }
  const pickupAt = toDateTime(formData.pickupDate, formData.pickupTime);
  const returnAt = toDateTime(formData.returnDate, formData.returnTime);
  if (!pickupAt || !returnAt) {
    return { ok: false, error: 'Invalid date or time format.' };
  }
  if (returnAt <= pickupAt) {
    return { ok: false, error: 'Return date and time must be after pickup date and time.' };
  }
  return {
    ok: true,
    payload: {
      ...formData,
      rentalDays: getRentalDays(pickupAt, returnAt),
    },
  };
}

/**
 * Escapes text for safe insertion into debug overlay HTML.
 * @param {string} text
 * @returns {string}
 */
function escapeHtmlForDebug(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Records a Braze custom event for the debug drawer and refreshes the list if mounted.
 * @param {{ name?: string, props?: Record<string, unknown> }} payload
 * @returns {void}
 */
function appendCustomEventLogged(payload) {
  const entry = {
    name: typeof payload?.name === 'string' ? payload.name : '(unknown)',
    props: payload?.props,
    at: Date.now(),
  };
  customEventLogBuffer.push(entry);
  if (customEventLogBuffer.length > CUSTOM_EVENT_LOG_MAX) {
    customEventLogBuffer.shift();
  }
  syncDebugEventLogUi();
}

/**
 * Rebuilds `#debug-event-log` from `customEventLogBuffer` (newest first).
 * @returns {void}
 */
function syncDebugEventLogUi() {
  const ul = document.getElementById('debug-event-log');
  if (!ul) return;
  ul.innerHTML = '';
  for (let i = customEventLogBuffer.length - 1; i >= 0; i -= 1) {
    const e = customEventLogBuffer[i];
    const li = document.createElement('li');
    li.className = 'text-[0.65rem] border-b border-gray-100 pb-1 mb-1';
    const propsStr = e.props != null ? formatDebugJson(e.props) : '';
    li.innerHTML = `<span class="font-medium text-sia-navy">${escapeHtmlForDebug(e.name)}</span> <span class="text-sia-text-muted">${new Date(e.at).toISOString()}</span><pre class="mt-0.5 whitespace-pre-wrap break-words font-mono bg-gray-50 p-1 rounded">${escapeHtmlForDebug(propsStr)}</pre>`;
    ul.appendChild(li);
  }
}

/**
 * Shows the login modal overlay.
 * @returns {void}
 */
function showLoginModal() {
  const el = document.getElementById('login-modal');
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
  el.setAttribute('aria-hidden', 'false');
}

/**
 * Hides the login modal overlay.
 * @returns {void}
 */
function closeLoginModal() {
  const el = document.getElementById('login-modal');
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
  el.setAttribute('aria-hidden', 'true');
}

/**
 * Completes login: Braze user, persistence, then continues booking if a search was pending.
 * @param {string} email
 * @returns {void}
 */
function completeLoginSuccess(email) {
  const normalized = email.trim().toLowerCase();
  BrazeManager.login(normalized);
  persistAuthSession(normalized, 'login');
  BrazeManager.requestImmediateDataFlush();
  AppLogger.info('[AUTH]', 'User logged in', { externalIdPreview: `${normalized.slice(0, 3)}…` });
  setLoginSuccessNotice(`Login successful. Welcome, ${normalized}.`);
  void retryDebugRestProfileHydrationAfterLogin(normalized);
  closeLoginModal();
  document.getElementById('login-email-err')?.classList.add('hidden');
  document.getElementById('login-form-err')?.classList.add('hidden');
  if (pendingRentalSearchAfterLogin) {
    StorageManager.set(STORAGE_KEYS.SEARCH, pendingRentalSearchAfterLogin);
    const saved = pendingRentalSearchAfterLogin;
    pendingRentalSearchAfterLogin = null;
    AppLogger.info('[UI]', 'Rental search set after login', saved);
    moveToStep(STEPS.CARS);
    return;
  }
  render();
  bindStepActions();
}

/**
 * @returns {{product_id:string,product_name:string,variant_id:string,image_url:string,product_url:string,quantity:number,price:number,metadata:Record<string,unknown>}[]}
 */
function buildCartProducts() {
  const car = getSelectedCarState();
  const addonIds = getSelectedAddonIds();
  const addons = RENTAL_ADDONS.filter((addon) => addonIds.includes(addon.id));
  /** @type {ReturnType<typeof buildCartProducts>} */
  const products = [];
  if (car) {
    products.push({
      product_id: car.id,
      product_name: `${car.brand} ${car.model}`,
      variant_id: car.type.toLowerCase().replace(/\s+/g, '_'),
      image_url: car.imageUrl,
      product_url: `${location.origin}${location.pathname}#car-${car.id}`,
      quantity: 1,
      price: car.dailyPriceTwd,
      metadata: {
        seats: car.seats,
        mileage_km_per_l: car.mileage,
        category: 'car_rental',
      },
    });
  }
  addons.forEach((addon) => {
    products.push({
      product_id: addon.id,
      product_name: addon.name,
      variant_id: 'addon_daily',
      image_url: '',
      product_url: `${location.origin}${location.pathname}#addon-${addon.id}`,
      quantity: 1,
      price: addon.dailyPriceTwd,
      metadata: {
        category: 'rental_addon',
      },
    });
  });
  return products;
}

/**
 * @returns {void}
 */
function recalculatePricing() {
  const search = getSearchState();
  const car = getSelectedCarState();
  const rentalDays = search?.rentalDays ?? 0;
  const selectedAddons = RENTAL_ADDONS.filter((addon) => getSelectedAddonIds().includes(addon.id));
  const carTotal = car ? car.dailyPriceTwd * rentalDays : 0;
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.dailyPriceTwd * rentalDays, 0);
  const total = carTotal + addonsTotal;
  const pricing = { carTotal, addonsTotal, total };
  StorageManager.set(STORAGE_KEYS.PRICING, pricing);
  AppLogger.info('[UI]', 'Pricing recalculated', pricing);
}

/**
 * @returns {void}
 */
function logCartUpdatedEvent() {
  const search = getSearchState();
  const pricing = getPricingState();
  if (!search) return;
  BrazeManager.logCustomEvent('ecommerce.cart_updated', {
    cart_id: `rental-cart-${search.pickupDate}-${search.returnDate}`,
    total_value: pricing.total,
    subtotal_value: pricing.total,
    tax: 0,
    shipping: 0,
    currency: 'TWD',
    products: buildCartProducts(),
    source: 'web',
    metadata: {
      pickup_location: search.pickupLocation,
      return_location: search.returnLocation,
      rental_days: search.rentalDays,
    },
  });
}

/**
 * @param {keyof typeof STEPS} nextStep
 * @returns {void}
 */
function moveToStep(nextStep) {
  currentStep = nextStep;
  StorageManager.set(STORAGE_KEYS.STEP, nextStep);
  render();
  bindStepActions();
}

/**
 * @returns {void}
 */
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  const search = getSearchState() ?? {
    pickupLocation: '',
    returnLocation: '',
    pickupDate: '',
    pickupTime: '',
    returnDate: '',
    returnTime: '',
    rentalDays: 0,
  };
  const selectedCar = getSelectedCarState();
  const selectedAddonIds = getSelectedAddonIds();
  const pricing = getPricingState();
  const selectedAddons = RENTAL_ADDONS.filter((addon) => selectedAddonIds.includes(addon.id));
  const order = getOrderState();

  let stepContent = '';
  if (currentStep === STEPS.SEARCH) {
    const slide = CAROUSEL_SLIDES[carouselIndex];
    const dots = CAROUSEL_SLIDES.map(
      (item, idx) =>
        `<button class="carousel-dot ${idx === carouselIndex ? 'active' : ''}" data-carousel-index="${idx}" aria-label="View ${item.title}"></button>`,
    ).join('');
    const promoCards = PROMOTIONAL_CARDS.map(
      (card) => `
        <article class="promo-card">
          <i class="fa-solid ${card.icon}" aria-hidden="true"></i>
          <h3>${card.title}</h3>
          <p>${card.description}</p>
        </article>`,
    ).join('');
    stepContent = `
      <section class="hero-carousel" style="background-image: linear-gradient(90deg, rgba(0, 38, 99, 0.65), rgba(0, 38, 99, 0.25)), url('${slide.imageUrl}')">
        <div class="hero-carousel-content">
          <p class="hero-eyebrow">Taiwan Car Rental Offers</p>
          <h2>${slide.title}</h2>
          <p>${slide.subtitle}</p>
          <div class="hero-carousel-actions">
            <button class="carousel-btn secondary-btn" id="carousel-prev">Previous</button>
            <button class="carousel-btn primary-btn" id="carousel-next">Next</button>
          </div>
          <div class="carousel-dots">${dots}</div>
        </div>
      </section>
      ${renderRentalSearch(TAIWAN_LOCATIONS, search)}
      <section class="promo-grid">${promoCards}</section>
    `;
  } else if (currentStep === STEPS.CARS) {
    stepContent = renderCarList(CARS, selectedCar?.id ?? null, search);
  } else if (currentStep === STEPS.ADDONS) {
    stepContent = renderAddonsStep(RENTAL_ADDONS, selectedAddonIds);
  } else if (currentStep === STEPS.CONFIRMATION) {
    stepContent = renderConfirmationStep({
      search,
      car: selectedCar,
      addons: selectedAddons,
      pricing,
    });
  } else if (currentStep === STEPS.PAYMENT) {
    stepContent = renderPaymentStep(isPaymentProcessing);
  } else if (currentStep === STEPS.THANK_YOU && order) {
    stepContent = renderThankYouStep(order);
  }

  app.innerHTML = `
    <div class="rental-app">
      <header class="top-nav-bar">
        <div class="top-nav-brand">Carplus Taiwan</div>
        <nav>
          <button type="button" id="header-debug-toggle" class="top-nav-bar-btn" aria-expanded="false" aria-controls="debug-drawer">Debug</button>
          <a href="#" data-header-link="login">Login</a>
          <a href="#" data-header-link="private-hire">Private Car Hire</a>
          <a href="#" data-header-link="car-sharing">Car Sharing Service</a>
          <a href="#" data-header-link="locations">Service Locations</a>
        </nav>
      </header>
      <header class="page-header">
        <h1>Taiwan Car Rental</h1>
        <p>Book your ride with transparent NTD pricing.</p>
      </header>
      ${
        loginSuccessMessage
          ? `<div class="mb-4 rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status" aria-live="polite">
              ${escapeHtmlForDebug(loginSuccessMessage)}
            </div>`
          : ''
      }
      <div class="stepper">Step: ${currentStep.replace('_', ' ')}</div>
      ${stepContent}
      ${renderLoginModal()}
      ${renderDebugOverlay()}
    </div>
  `;
}

/**
 * @returns {void}
 */
function bindGlobalUiActions() {
  document.querySelectorAll('[data-header-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const key = /** @type {HTMLElement} */ (link).dataset.headerLink;
      AppLogger.info('[UI]', 'Header link clicked', { key });
      if (key === 'login') {
        showLoginModal();
      } else if (key === 'locations') {
        alert('Service locations: Taipei, Taichung, Tainan, and Kaohsiung.');
      } else {
        alert('This section is coming soon.');
      }
    });
  });

  const { toggle: debugToggle } = getDebugDrawerControls();
  setDebugDrawerOpen(isDebugDrawerOpen);

  debugToggle?.addEventListener('click', () => {
    const nextOpen = !isDebugDrawerOpen;
    setDebugDrawerOpen(nextOpen);
    if (nextOpen) {
      void refreshDebugProfile();
    }
  });

  document.getElementById('debug-drawer-close')?.addEventListener('click', () => {
    setDebugDrawerOpen(false);
  });

  document.getElementById('debug-refresh-profile')?.addEventListener('click', () => {
    void refreshDebugProfile({ force: true });
  });

  document.getElementById('debug-reset-app')?.addEventListener('click', () => {
    resetAppFromDebug();
  });

  document.getElementById('login-modal-close')?.addEventListener('click', () => {
    closeLoginModal();
  });
  document.getElementById('login-cancel')?.addEventListener('click', () => {
    closeLoginModal();
  });

  document.getElementById('login-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const emailInput = /** @type {HTMLInputElement | null} */ (document.getElementById('login-email'));
    const emailErr = document.getElementById('login-email-err');
    const formErr = document.getElementById('login-form-err');
    emailErr?.classList.add('hidden');
    formErr?.classList.add('hidden');
    const email = emailInput?.value.trim() ?? '';
    if (!email || !emailInput?.checkValidity()) {
      if (emailErr) {
        emailErr.textContent = 'Enter a valid email.';
        emailErr.classList.remove('hidden');
      }
      return;
    }
    completeLoginSuccess(email);
  });

  syncDebugEventLogUi();
  writeDebugJson('debug-sdk-user', {
    external_id: getPersistedExternalId(),
    ...BrazeManager.getUserData(),
  });
  if (isDebugDrawerOpen) {
    void refreshDebugProfile();
  }

  if (currentStep === STEPS.SEARCH) {
    document.getElementById('carousel-prev')?.addEventListener('click', () => {
      carouselIndex = (carouselIndex - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length;
      render();
      bindStepActions();
    });
    document.getElementById('carousel-next')?.addEventListener('click', () => {
      carouselIndex = (carouselIndex + 1) % CAROUSEL_SLIDES.length;
      render();
      bindStepActions();
    });
    document.querySelectorAll('[data-carousel-index]').forEach((dot) => {
      dot.addEventListener('click', () => {
        const nextIndex = Number(/** @type {HTMLElement} */ (dot).dataset.carouselIndex);
        if (Number.isNaN(nextIndex)) return;
        carouselIndex = nextIndex;
        render();
        bindStepActions();
      });
    });
  }
}

/**
 * @returns {void}
 */
function bindSearchStep() {
  const form = document.getElementById('rental-search-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = validateSearchForm({
      pickupLocation: /** @type {HTMLSelectElement} */ (document.getElementById('pickup-location')).value,
      returnLocation: /** @type {HTMLSelectElement} */ (document.getElementById('return-location')).value,
      pickupDate: /** @type {HTMLInputElement} */ (document.getElementById('pickup-date')).value,
      pickupTime: /** @type {HTMLInputElement} */ (document.getElementById('pickup-time')).value,
      returnDate: /** @type {HTMLInputElement} */ (document.getElementById('return-date')).value,
      returnTime: /** @type {HTMLInputElement} */ (document.getElementById('return-time')).value,
    });
    const err = document.getElementById('search-form-error');
    if (!payload.ok || !payload.payload) {
      if (err) {
        err.textContent = payload.error ?? 'Invalid search';
        err.classList.remove('hidden');
      }
      AppLogger.warn('[UI]', 'Search validation failed', payload.error);
      return;
    }
    if (!getPersistedExternalId()) {
      pendingRentalSearchAfterLogin = payload.payload;
      showLoginModal();
      AppLogger.info('[UI]', 'Login required before search', {});
      return;
    }
    StorageManager.set(STORAGE_KEYS.SEARCH, payload.payload);
    AppLogger.info('[UI]', 'Rental search set', payload.payload);
    moveToStep(STEPS.CARS);
  });
}

/**
 * @returns {void}
 */
function bindCarStep() {
  document.querySelectorAll('.car-select-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = /** @type {HTMLElement} */ (button).dataset.carId;
      const car = CARS.find((item) => item.id === id);
      if (!car) return;
      StorageManager.set(STORAGE_KEYS.CAR, car);
      recalculatePricing();
      BrazeManager.logCustomEvent('ecommerce.product_viewed', {
        product_id: car.id,
        product_name: `${car.brand} ${car.model}`,
        variant_id: car.type.toLowerCase().replace(/\s+/g, '_'),
        image_url: car.imageUrl,
        product_url: `${location.origin}${location.pathname}#car-${car.id}`,
        price: car.dailyPriceTwd,
        currency: 'TWD',
        source: 'web',
        metadata: {
          seats: car.seats,
          mileage_km_per_l: car.mileage,
        },
      });
      logCartUpdatedEvent();
      moveToStep(STEPS.CARS);
    });
  });

  document.getElementById('back-to-search')?.addEventListener('click', () => moveToStep(STEPS.SEARCH));
  document.getElementById('continue-to-addons')?.addEventListener('click', () => {
    if (!getSelectedCarState()) return;
    moveToStep(STEPS.ADDONS);
  });
}

/**
 * @returns {void}
 */
function bindAddonsStep() {
  document.querySelectorAll('[data-addon-id]').forEach((input) => {
    input.addEventListener('change', () => {
      const ids = Array.from(document.querySelectorAll('[data-addon-id]:checked')).map(
        (node) => /** @type {HTMLElement} */ (node).dataset.addonId,
      );
      StorageManager.set(STORAGE_KEYS.ADDONS, ids.filter(Boolean));
      recalculatePricing();
      logCartUpdatedEvent();
      moveToStep(STEPS.ADDONS);
    });
  });

  document.getElementById('back-to-cars')?.addEventListener('click', () => moveToStep(STEPS.CARS));
  document.getElementById('continue-to-confirmation')?.addEventListener('click', () => moveToStep(STEPS.CONFIRMATION));
}

/**
 * @returns {void}
 */
function bindConfirmationStep() {
  document.getElementById('back-to-addons')?.addEventListener('click', () => moveToStep(STEPS.ADDONS));
  document.getElementById('continue-to-payment')?.addEventListener('click', () => {
    const search = getSearchState();
    const pricing = getPricingState();
    BrazeManager.logCustomEvent('ecommerce.checkout_started', {
      checkout_id: `checkout-${Date.now()}`,
      cart_id: `rental-cart-${search?.pickupDate}-${search?.returnDate}`,
      total_value: pricing.total,
      subtotal_value: pricing.total,
      tax: 0,
      shipping: 0,
      currency: 'TWD',
      products: buildCartProducts(),
      source: 'web',
      metadata: {
        checkout_url: `${location.origin}${location.pathname}#payment`,
      },
    });
    moveToStep(STEPS.PAYMENT);
  });
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidCardNumber(value) {
  return /^\d{13,19}$/.test(value.replace(/\s+/g, ''));
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidExpiry(value) {
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(value);
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidCvv(value) {
  return /^\d{3,4}$/.test(value);
}

/**
 * @returns {Promise<void>}
 */
async function processPayment() {
  isPaymentProcessing = true;
  render();
  bindStepActions();
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const search = getSearchState();
  const car = getSelectedCarState();
  const pricing = getPricingState();
  const orderId = `CR-${Date.now()}`;
  const order = {
    bookingRef: orderId,
    total: pricing.total,
    pickupLocation: search?.pickupLocation ?? '',
    returnLocation: search?.returnLocation ?? '',
    pickupDate: `${search?.pickupDate ?? ''} ${search?.pickupTime ?? ''}`.trim(),
    returnDate: `${search?.returnDate ?? ''} ${search?.returnTime ?? ''}`.trim(),
    carLabel: car ? `${car.brand} ${car.model}` : '',
  };
  StorageManager.set(STORAGE_KEYS.ORDER, order);
  BrazeManager.logCustomEvent('ecommerce.order_placed', {
    order_id: orderId,
    cart_id: `rental-cart-${search?.pickupDate}-${search?.returnDate}`,
    total_value: pricing.total,
    subtotal_value: pricing.total,
    tax: 0,
    shipping: 0,
    currency: 'TWD',
    products: buildCartProducts(),
    source: 'web',
    metadata: {
      order_status_url: `${location.origin}${location.pathname}#thank-you`,
    },
  });
  AppLogger.info('[SYSTEM]', 'Payment success', { orderId, total: pricing.total });
  isPaymentProcessing = false;
  moveToStep(STEPS.THANK_YOU);
}

/**
 * @returns {void}
 */
function bindPaymentStep() {
  document.getElementById('back-to-confirmation')?.addEventListener('click', () => {
    if (isPaymentProcessing) return;
    moveToStep(STEPS.CONFIRMATION);
  });

  const form = document.getElementById('payment-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isPaymentProcessing) return;
    const cardholderName = /** @type {HTMLInputElement} */ (document.getElementById('cardholder-name')).value.trim();
    const cardNumber = /** @type {HTMLInputElement} */ (document.getElementById('card-number')).value.trim();
    const cardExpiry = /** @type {HTMLInputElement} */ (document.getElementById('card-expiry')).value.trim();
    const cardCvv = /** @type {HTMLInputElement} */ (document.getElementById('card-cvv')).value.trim();
    const errorEl = document.getElementById('payment-error');

    if (!cardholderName || !isValidCardNumber(cardNumber) || !isValidExpiry(cardExpiry) || !isValidCvv(cardCvv)) {
      if (errorEl) {
        errorEl.textContent = 'Please enter valid payment details.';
        errorEl.classList.remove('hidden');
      }
      AppLogger.warn('[UI]', 'Payment validation failed');
      return;
    }
    void processPayment();
  });
}

/**
 * @returns {void}
 */
function bindThankYouStep() {
  document.getElementById('start-new-booking')?.addEventListener('click', () => {
    StorageManager.remove(STORAGE_KEYS.SEARCH);
    StorageManager.remove(STORAGE_KEYS.CAR);
    StorageManager.remove(STORAGE_KEYS.ADDONS);
    StorageManager.remove(STORAGE_KEYS.PRICING);
    StorageManager.remove(STORAGE_KEYS.ORDER);
    StorageManager.set(STORAGE_KEYS.STEP, STEPS.SEARCH);
    AppLogger.info('[UI]', 'Booking state reset');
    moveToStep(STEPS.SEARCH);
  });
}

/**
 * @returns {void}
 */
function bindStepActions() {
  bindGlobalUiActions();
  if (currentStep === STEPS.SEARCH) bindSearchStep();
  if (currentStep === STEPS.CARS) bindCarStep();
  if (currentStep === STEPS.ADDONS) bindAddonsStep();
  if (currentStep === STEPS.CONFIRMATION) bindConfirmationStep();
  if (currentStep === STEPS.PAYMENT) bindPaymentStep();
  if (currentStep === STEPS.THANK_YOU) bindThankYouStep();
}

/**
 * @returns {void}
 */
function hydratePersistedStep() {
  const step = /** @type {keyof typeof STEPS} */ (StorageManager.get(STORAGE_KEYS.STEP, STEPS.SEARCH));
  currentStep = Object.values(STEPS).includes(step) ? step : STEPS.SEARCH;
  if (currentStep !== STEPS.SEARCH && !getSearchState()) currentStep = STEPS.SEARCH;
  if ([STEPS.ADDONS, STEPS.CONFIRMATION, STEPS.PAYMENT, STEPS.THANK_YOU].includes(currentStep) && !getSelectedCarState()) {
    currentStep = STEPS.CARS;
  }
}

/**
 * @returns {void}
 */
export function bootstrapApp() {
  AppLogger.info('[SYSTEM]', `Car rental app start v${__APP_VERSION__}`);
  const apiKey = import.meta.env.VITE_BRAZE_SDK_KEY || '';
  const baseUrl = import.meta.env.VITE_BRAZE_SDK_URL || '';
  BrazeManager.initialize(apiKey, baseUrl);
  BrazeManager.syncUserFromStorage();
  BrazeManager.subscribe(EVENT_LOGGED, (payload) => {
    appendCustomEventLogged(/** @type {{ name?: string, props?: Record<string, unknown> }} */ (payload));
  });
  hydratePersistedStep();
  recalculatePricing();
  render();
  bindStepActions();
}
