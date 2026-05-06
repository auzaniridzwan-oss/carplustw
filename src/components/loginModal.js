/**
 * Flowbite-compatible login modal (email or Braze External ID for changeUser).
 * @returns {string}
 */
export function renderLoginModal() {
  return `
  <div id="login-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center md:inset-0 h-[calc(100%-1rem)] max-h-full p-4">
    <div class="relative w-full max-w-lg max-h-full">
      <div class="relative bg-white rounded-sm shadow-lg border border-sia-border">
        <div class="flex items-start justify-between p-4 border-b border-sia-border rounded-t-sm">
          <h3 id="login-modal-title" class="text-lg font-display font-semibold text-sia-navy">Log in</h3>
          <button type="button" id="login-modal-close" class="text-sia-text-muted hover:text-sia-navy p-1" aria-label="Close">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <form id="login-form" class="p-4 md:p-6 space-y-4" novalidate>
          <p class="text-sm text-sia-text-muted">Enter the email or Braze External ID for this user (same value you use in the Braze dashboard).</p>
          <div>
            <label for="login-external-id" class="block text-sm font-medium mb-1">Email or External ID <span class="text-red-600">*</span></label>
            <input id="login-external-id" name="external_id" type="text" required maxlength="255" class="w-full border border-sia-border rounded-sm p-2.5 text-sm" autocomplete="username" />
            <p id="login-external-id-err" class="hidden text-xs text-red-600 mt-1"></p>
          </div>
          <p id="login-form-err" class="hidden text-sm text-red-600"></p>
          <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <button type="button" id="login-cancel" class="px-4 py-2 text-sm border border-sia-border rounded-sm hover:bg-sia-muted">Cancel</button>
            <button type="submit" class="px-4 py-2 text-sm font-semibold text-sia-navy bg-sia-gold hover:bg-sia-gold/90 rounded-sm">Log in</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}
