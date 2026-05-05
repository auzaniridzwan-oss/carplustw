/**
 * @param {boolean} isProcessing
 * @returns {string}
 */
export function renderPaymentStep(isProcessing) {
  return `
    <section class="panel">
      <h2>Payment</h2>
      <p class="muted">Payment is simulated. Use any valid-looking card details.</p>
      <form id="payment-form" class="grid-form">
        <label>
          Cardholder Name
          <input id="cardholder-name" type="text" required />
        </label>
        <label>
          Card Number
          <input id="card-number" type="text" inputmode="numeric" placeholder="4111 1111 1111 1111" required />
        </label>
        <label>
          Expiry (MM/YY)
          <input id="card-expiry" type="text" placeholder="12/28" required />
        </label>
        <label>
          CVV
          <input id="card-cvv" type="password" inputmode="numeric" placeholder="123" required />
        </label>
        <p id="payment-error" class="error hidden"></p>
        <div class="actions">
          <button type="button" class="secondary-btn" id="back-to-confirmation">Back</button>
          <button type="submit" class="primary-btn" ${isProcessing ? 'disabled' : ''}>
            ${isProcessing ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </form>
    </section>
  `;
}
