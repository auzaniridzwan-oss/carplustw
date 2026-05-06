import siaLogoSmallUrl from '../images/sia-logo-small.png';

/**
 * Marketing shell: dual-level header and footer.
 * @param {{ activeView: string, loggedIn?: boolean }} opts
 * @returns {string} HTML
 */
export function renderShellHeader(opts) {
  const { activeView, loggedIn = false } = opts;
  const authLinks = loggedIn
    ? ''
    : `
        <a href="#" id="header-login-link" data-nav="utility" class="hover:underline">Login</a>
        <a href="#" data-nav="utility" class="hover:underline">Sign Up</a>`;
  const navCls = (v) =>
    v === activeView
      ? 'text-sia-navy font-semibold border-b-2 border-sia-gold pb-0.5'
      : 'text-sia-text hover:text-sia-navy';

  return `
  <header class="sticky top-0 z-40 shadow-sm">
    <div class="bg-sia-navy text-white text-xs">
      <div class="max-w-7xl mx-auto px-4 flex justify-end gap-6 py-2 items-center">
    
        <button type="button" id="debug-launcher-recovery" class="hidden hover:underline text-white" aria-label="Show debug panel">Debug</button>
        ${authLinks}
        <button type="button" class="inline-flex items-center gap-1 hover:underline" aria-label="Language">
          <span>EN</span>
          <i class="fa-solid fa-chevron-down text-[0.65rem]" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <div class="bg-white border-b border-sia-border">
      <div class="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 py-3">
        <button type="button" id="sia-logo-btn" class="flex items-center gap-2 text-left" aria-label="Home">
          <img src="${siaLogoSmallUrl}" alt="" width="160" height="40" class="h-9 w-auto max-w-[200px] object-contain object-left" />
        </button>
        <nav class="flex flex-wrap items-center gap-4 md:gap-8 text-sm" aria-label="Primary">
          <a href="#/home" data-route="HOME" class="${navCls('HOME')}">Book</a>
         
          <a href="#" data-nav="decor" class="hidden sm:inline text-sia-text-muted hover:text-sia-navy">Experience</a>
          <a href="#" data-nav="decor" class="hidden sm:inline text-sia-text-muted hover:text-sia-navy">Discover</a>
        </nav>
      </div>
    </div>
  </header>`;
}

/** @returns {string} HTML */
export function renderShellFooter() {
  const col = (title, links) => `
    <div>
      <h3 class="font-display text-white text-sm font-semibold mb-4">${title}</h3>
      <ul class="space-y-2 text-sm text-sia-border">
        ${links.map((l) => `<li><a href="#" class="hover:text-white">${l}</a></li>`).join('')}
      </ul>
    </div>`;
  return `
  <footer class="bg-sia-navy text-sia-border mt-auto">
    <div class="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
      ${col('Help &amp; support', ['Roadside assistance', 'FAQs', 'Contact us', 'Damage &amp; claims'])}
      ${col('Rent &amp; locations', ['Branch finder', 'Airport pickup &amp; return', 'One-way rental', 'Service areas'])}
      ${col('Products &amp; add-ons', ['Daily rental', 'Weekly &amp; monthly rental', 'Insurance &amp; protection', 'Extras &amp; add-ons'])}
      ${col('Company', ['About us', 'Careers', 'Press', 'Sustainability'])}
    </div>
    <div class="border-t border-white/10">
      <div class="max-w-7xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div class="flex flex-wrap gap-4">
          <a href="#" class="hover:text-white">Privacy</a>
          <a href="#" class="hover:text-white">Terms</a>
          <a href="#" class="hover:text-white">Cookies</a>
        </div>
        <div class="flex gap-4 text-white">
          <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a>
          <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram" aria-hidden="true"></i></a>
          <a href="#" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in" aria-hidden="true"></i></a>
        </div>
        <p class="text-sia-border w-full md:w-auto text-center md:text-right">Trusted fleet &amp; Taiwan coverage (demo)</p>
      </div>
    </div>
  </footer>`;
}
