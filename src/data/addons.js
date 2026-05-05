/**
 * @typedef {Object} RentalAddon
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} dailyPriceTwd
 */

/**
 * Optional add-ons for car rentals.
 * @type {RentalAddon[]}
 */
export const RENTAL_ADDONS = [
  {
    id: 'insurance_plus',
    name: 'Additional Insurance Coverage',
    description: 'Lower deductible and broader accidental damage protection.',
    dailyPriceTwd: 500,
  },
  {
    id: 'gps_navigation',
    name: 'GPS Navigation Unit',
    description: 'Portable GPS device with updated Taiwan road maps.',
    dailyPriceTwd: 180,
  },
  {
    id: 'child_seat',
    name: 'Child Seat',
    description: 'Safety-certified child seat for young passengers.',
    dailyPriceTwd: 220,
  },
  {
    id: 'wifi_hotspot',
    name: 'Wi-Fi Hotspot',
    description: 'In-car portable hotspot with unlimited data.',
    dailyPriceTwd: 250,
  },
];
