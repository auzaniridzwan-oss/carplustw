/**
 * @param {{id:string,name:string,description:string,dailyPriceTwd:number}[]} addons
 * @param {string[]} selectedAddonIds
 * @returns {string}
 */
export function renderAddonsStep(addons, selectedAddonIds) {
  const markup = addons
    .map((addon) => {
      const checked = selectedAddonIds.includes(addon.id) ? 'checked' : '';
      return `
      <label class="addon-item">
        <input type="checkbox" data-addon-id="${addon.id}" ${checked} />
        <span>
          <strong>${addon.name}</strong>
          <small>${addon.description}</small>
          <small>NT$ ${addon.dailyPriceTwd.toLocaleString()} / day</small>
        </span>
      </label>`;
    })
    .join('');

  return `
    <section class="panel">
      <h2>Optional Add-ons</h2>
      <p class="muted">Select extras to improve your trip comfort and safety.</p>
      <div class="addon-list">${markup}</div>
      <div class="actions">
        <button class="secondary-btn" id="back-to-cars">Back</button>
        <button class="primary-btn" id="continue-to-confirmation">Continue to Confirmation</button>
      </div>
    </section>
  `;
}
