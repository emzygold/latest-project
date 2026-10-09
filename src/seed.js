import { db } from './db.js';

const rows = [
  ['3 Bedroom Flat, Lekki Phase 1', 'rent', 6500000, 'Lekki, Lagos', 3, 3, 'Serviced, 24/7 power, gated estate, parking for 2 cars.'],
  ['2 Bedroom Apartment, Yaba', 'rent', 2800000, 'Yaba, Lagos', 2, 2, 'Close to UNILAG and the tech hub. Prepaid meter, tiled.'],
  ['4 Bedroom Duplex, Ajah', 'sale', 85000000, 'Ajah, Lagos', 4, 5, 'Detached duplex with BQ, C of O, in a gated estate.'],
  ['Mini Flat, Wuse 2', 'rent', 1800000, 'Wuse 2, Abuja', 1, 1, 'Newly renovated, water treatment, secure compound.'],
  ['3 Bedroom Terrace, Gwarinpa', 'sale', 45000000, 'Gwarinpa, Abuja', 3, 4, 'Terrace in a quiet estate, good road network.'],
];
if (db.prepare('SELECT COUNT(*) n FROM listings').get().n === 0) {
  const ins = db.prepare('INSERT INTO listings (title,type,price,location,bedrooms,bathrooms,description) VALUES (?,?,?,?,?,?,?)');
  for (const r of rows) ins.run(...r);
  console.log(`Seeded ${rows.length} sample listings.`);
} else console.log('Listings already exist, skipping seed.');
