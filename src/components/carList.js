/**
 * @param {import('../data/cars.js').CARS[number][]} cars
 * @param {string|null} selectedCarId
 * @param {{pickupLocation:string,returnLocation:string,pickupDate:string,returnDate:string,rentalDays:number}} summary
 * @returns {string}
 */
export function renderCarList(cars, selectedCarId, summary) {
  const cards = cars
    .map((car) => {
      const selected = selectedCarId === car.id;
      return `
      <article class="car-card ${selected ? 'selected' : ''}">
        <img src="${car.imageUrl}" alt="${car.brand} ${car.model}" />
        <div class="car-content">
          <h3>${car.brand} ${car.model}</h3>
          <p class="muted">${car.type}</p>
          <ul>
            <li>Seats: ${car.seats}</li>
            <li>Mileage: ${car.mileage} km/L</li>
            <li>Price: NT$ ${car.dailyPriceTwd.toLocaleString()} / day</li>
          </ul>
          <button class="primary-btn car-select-btn" data-car-id="${car.id}">
            ${selected ? 'Selected' : 'Select Car'}
          </button>
        </div>
      </article>`;
    })
    .join('');

  return `
    <section class="panel">
      <h2>Select a Car</h2>
      <p class="muted">
        ${summary.pickupLocation} to ${summary.returnLocation} · ${summary.pickupDate} to ${summary.returnDate} ·
        ${summary.rentalDays} day(s)
      </p>
      <div class="car-grid">${cards}</div>
      <div class="actions">
        <button class="secondary-btn" id="back-to-search">Back</button>
        <button class="primary-btn" id="continue-to-addons" ${selectedCarId ? '' : 'disabled'}>
          Continue
        </button>
      </div>
    </section>
  `;
}
