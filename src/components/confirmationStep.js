/**
 * @param {{
 *  search: {pickupLocation:string,returnLocation:string,pickupDate:string,pickupTime:string,returnDate:string,returnTime:string,rentalDays:number},
 *  car: {brand:string,model:string,type:string,dailyPriceTwd:number}|null,
 *  addons: {name:string,dailyPriceTwd:number}[],
 *  pricing: {carTotal:number,addonsTotal:number,total:number}
 * }} data
 * @returns {string}
 */
export function renderConfirmationStep(data) {
  const addonItems = data.addons.length
    ? data.addons
      .map((addon) => `<li>${addon.name} - NT$ ${addon.dailyPriceTwd.toLocaleString()} / day</li>`)
      .join('')
    : '<li>No add-ons selected</li>';

  return `
    <section class="panel">
      <h2>Confirm Your Booking</h2>
      <div class="summary-grid">
        <div>
          <h3>Trip Details</h3>
          <p>${data.search.pickupLocation} (${data.search.pickupDate} ${data.search.pickupTime})</p>
          <p>${data.search.returnLocation} (${data.search.returnDate} ${data.search.returnTime})</p>
          <p>${data.search.rentalDays} rental day(s)</p>
        </div>
        <div>
          <h3>Selected Car</h3>
          <p>${data.car ? `${data.car.brand} ${data.car.model}` : 'No car selected'}</p>
          <p>${data.car ? data.car.type : '-'}</p>
          <p>${data.car ? `NT$ ${data.car.dailyPriceTwd.toLocaleString()} / day` : ''}</p>
        </div>
      </div>
      <div class="pricing-block">
        <h3>Add-ons</h3>
        <ul>${addonItems}</ul>
        <h3>Pricing Summary</h3>
        <p>Car total: NT$ ${data.pricing.carTotal.toLocaleString()}</p>
        <p>Add-ons total: NT$ ${data.pricing.addonsTotal.toLocaleString()}</p>
        <p class="total">Total: NT$ ${data.pricing.total.toLocaleString()}</p>
      </div>
      <div class="actions">
        <button class="secondary-btn" id="back-to-addons">Back</button>
        <button class="primary-btn" id="continue-to-payment">Proceed to Payment</button>
      </div>
    </section>
  `;
}
