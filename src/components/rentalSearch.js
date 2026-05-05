/**
 * @param {string[]} locations
 * @param {{pickupLocation:string,returnLocation:string,pickupDate:string,pickupTime:string,returnDate:string,returnTime:string}} values
 * @returns {string}
 */
export function renderRentalSearch(locations, values) {
  const locationOptions = locations
    .map((location) => {
      const pickupSelected = values.pickupLocation === location ? 'selected' : '';
      const returnSelected = values.returnLocation === location ? 'selected' : '';
      return {
        pickup: `<option value="${location}" ${pickupSelected}>${location}</option>`,
        ret: `<option value="${location}" ${returnSelected}>${location}</option>`,
      };
    })
    .reduce(
      (acc, item) => {
        acc.pickup += item.pickup;
        acc.ret += item.ret;
        return acc;
      },
      { pickup: '', ret: '' },
    );

  return `
    <section class="panel">
      <h2>Search Rental Cars</h2>
      <p class="muted">Choose your route and rental period in Taiwan.</p>
      <form id="rental-search-form" class="grid-form">
        <label>
          Pickup Location
          <select id="pickup-location" required>
            <option value="">Select pickup town</option>
            ${locationOptions.pickup}
          </select>
        </label>
        <label>
          Return Location
          <select id="return-location" required>
            <option value="">Select return town</option>
            ${locationOptions.ret}
          </select>
        </label>
        <label>
          Pickup Date
          <input id="pickup-date" type="date" value="${values.pickupDate}" required />
        </label>
        <label>
          Pickup Time
          <input id="pickup-time" type="time" value="${values.pickupTime}" required />
        </label>
        <label>
          Return Date
          <input id="return-date" type="date" value="${values.returnDate}" required />
        </label>
        <label>
          Return Time
          <input id="return-time" type="time" value="${values.returnTime}" required />
        </label>
        <p id="search-form-error" class="error hidden"></p>
        <div class="actions">
          <button type="submit" class="primary-btn">Find Available Cars</button>
        </div>
      </form>
    </section>
  `;
}
