// src/lib/categories.js

// The categories, in the order they are shown.
export const CATEGORIES = [
  { key: 'groceries', label: 'Groceries' },
  { key: 'eating_out', label: 'Eating out' },
  { key: 'transport', label: 'Transport' },
  { key: 'bills', label: 'Bills' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'health', label: 'Health' },
  { key: 'income', label: 'Income' },
  { key: 'other', label: 'Other' },
];

// One line per shop. A description belongs to a shop when it contains the
// shop name, ignoring case. Add a shop by adding a line.
const SHOP_RULES = [
  { name: 'Greenbarrow Fresh', category: 'groceries' },
  { name: 'Pennywhistle Market', category: 'groceries' },
  { name: 'Lowtide Grocers', category: 'groceries' },
  { name: 'Harvest Lane Foods', category: 'groceries' },
  { name: 'Pasta', category: 'eating_out' },
  { name: 'Pizza & Co', category: 'eating_out' },
  { name: 'Kestrel Coffee Bar', category: 'eating_out' },
  { name: 'Saltbush Noodle House', category: 'eating_out' },
  { name: 'Ember Grill', category: 'eating_out' },
  { name: 'Waverly Fuel Stop', category: 'transport' },
  { name: 'Tramline Fares', category: 'transport' },
  { name: 'Lantern Rideshare', category: 'transport' },
  { name: 'Northgate Parking', category: 'transport' },
  { name: 'Brightfield Power', category: 'bills' },
  { name: 'Clearwater Utilities', category: 'bills' },
  { name: 'Skyline Broadband', category: 'bills' },
  { name: 'Hollis Insurance', category: 'bills' },
  { name: 'Marlowe Homewares', category: 'shopping' },
  { name: 'Quillon Books', category: 'shopping' },
  { name: 'Fernhill Outfitters', category: 'shopping' },
  { name: 'Pixel Parade Tech', category: 'shopping' },
  { name: 'Larkspur Pharmacy', category: 'health' },
  { name: 'Elmgrove Physio', category: 'health' },
  { name: 'Cobalt Dental', category: 'health' },
  { name: 'Sunnyvale Optical', category: 'health' },
  { name: 'Brightwave Payroll', category: 'income' },
  { name: 'Tidepool Interest', category: 'income' },
  { name: 'Oakridge Dividends', category: 'income' },
];

// Returns the category key for a transaction description. The first shop in
// the rules whose name appears in the description wins; no match is 'other'.
export function categoryOf(description, rules = SHOP_RULES) {
  const text = String(description).toLowerCase();
  const shop = rules.find((rule) => text.includes(rule.name.toLowerCase()));
  return shop ? shop.category : 'other';
}
