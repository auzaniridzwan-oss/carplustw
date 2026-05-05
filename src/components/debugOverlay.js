/**
 * Debug drawer (opened from header). No floating FAB — use `#header-debug-toggle` in app shell.
 * @returns {string}
 */
export function renderDebugOverlay() {
  return `
  <div id="debug-drawer" class="fixed top-0 left-0 z-[100] h-screen w-80 max-w-[90vw] p-4 transition-transform -translate-x-full bg-white border-r border-sia-border shadow-xl flex flex-col" tabindex="-1" aria-labelledby="debug-drawer-label">
    <div class="flex items-center justify-between mb-4">
      <h2 id="debug-drawer-label" class="text-sm font-semibold text-sia-navy">Debug User Inspector</h2>
      <button type="button" id="debug-drawer-close" class="p-1 text-sia-text-muted hover:text-sia-navy" aria-label="Close debug panel">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
    <button type="button" id="debug-refresh-profile" class="mb-3 text-xs px-2 py-1 border border-sia-border rounded-sm hover:bg-sia-muted w-full">Refresh logged-in user (REST)</button>
    <div class="mb-3 pb-3 border-b border-sia-border">
      <button type="button" id="debug-reset-app" class="mb-1.5 text-xs px-2 py-1 border border-red-200 text-red-800 bg-red-50 rounded-sm hover:bg-red-100 w-full">Reset app</button>
      <p class="text-[0.65rem] text-sia-text-muted leading-snug">Logs out, clears all local storage for this site, and reloads.</p>
    </div>
    <div class="space-y-4 text-xs flex-1 min-h-0 flex flex-col">
      <div>
        <h3 class="font-medium text-sia-text mb-1">Logged-in SDK user</h3>
        <pre id="debug-sdk-user" class="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32"></pre>
      </div>
      <div>
        <h3 class="font-medium text-sia-text mb-1">Logged-in REST profile</h3>
        <pre id="debug-rest-profile" class="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-48"></pre>
      </div>
      <div class="flex-1 min-h-0 flex flex-col">
        <h3 class="font-medium text-sia-text mb-1">Custom events (live)</h3>
        <ul id="debug-event-log" class="space-y-1 flex-1 min-h-0 overflow-y-auto"></ul>
      </div>
    </div>
  </div>`;
}
