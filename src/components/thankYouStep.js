/**
 * @param {{bookingRef:string,total:number,pickupLocation:string,returnLocation:string,pickupDate:string,returnDate:string,carLabel:string}} order
 * @returns {string}
 */
export function renderThankYouStep(order) {
  return `
    <section class="panel">
      <h2>Thank You for Your Booking</h2>
      <p>Your payment was successful and your car is reserved.</p>
      <div class="pricing-block">
        <p><strong>Booking Ref:</strong> ${order.bookingRef}</p>
        <p><strong>Route:</strong> ${order.pickupLocation} to ${order.returnLocation}</p>
        <p><strong>Period:</strong> ${order.pickupDate} to ${order.returnDate}</p>
        <p><strong>Car:</strong> ${order.carLabel}</p>
        <p class="total"><strong>Paid:</strong> NT$ ${order.total.toLocaleString()}</p>
      </div>
      <div class="actions">
        <button id="start-new-booking" class="primary-btn">Start New Booking</button>
      </div>
    </section>
  `;
}
