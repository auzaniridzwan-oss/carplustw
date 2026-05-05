/**
 * @typedef {Object} RentalCar
 * @property {string} id
 * @property {string} brand
 * @property {string} model
 * @property {string} type
 * @property {number} seats
 * @property {number} mileage
 * @property {number} dailyPriceTwd
 * @property {string} imageUrl
 */

/**
 * Mock car catalog for Taiwan rental inventory.
 * Image URLs are public Unsplash URLs.
 * @type {RentalCar[]}
 */
export const CARS = [
  {
    id: 'toyota-corolla-cross',
    brand: 'Toyota',
    model: 'Corolla Cross',
    type: 'Compact SUV',
    seats: 5,
    mileage: 16,
    dailyPriceTwd: 2500,
    imageUrl:
      'https://images.unsplash.com/photo-1611016186353-9af58c69a533?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'toyota-yaris',
    brand: 'Toyota',
    model: 'Yaris',
    type: 'Hatchback',
    seats: 5,
    mileage: 19,
    dailyPriceTwd: 1800,
    imageUrl:
      'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'nissan-kicks',
    brand: 'Nissan',
    model: 'Kicks',
    type: 'Crossover',
    seats: 5,
    mileage: 17,
    dailyPriceTwd: 2300,
    imageUrl:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'honda-crv',
    brand: 'Honda',
    model: 'CR-V',
    type: 'SUV',
    seats: 5,
    mileage: 14,
    dailyPriceTwd: 2900,
    imageUrl:
      'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'ford-kuga',
    brand: 'Ford',
    model: 'Kuga',
    type: 'SUV',
    seats: 5,
    mileage: 13,
    dailyPriceTwd: 3000,
    imageUrl:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'mazda3',
    brand: 'Mazda',
    model: 'Mazda3',
    type: 'Sedan',
    seats: 5,
    mileage: 15,
    dailyPriceTwd: 2400,
    imageUrl:
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80',
  },
];
