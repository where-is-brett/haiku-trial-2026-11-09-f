// tests/categories.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categoryOf } from '../src/lib/categories.js';

// Written out here from the approved spec, not read back from the module.
const SHOP_CATEGORIES = [
  ['Greenbarrow Fresh', 'groceries'],
  ['Pennywhistle Market', 'groceries'],
  ['Lowtide Grocers', 'groceries'],
  ['Harvest Lane Foods', 'groceries'],
  ['Pasta', 'eating_out'],
  ['Pizza & Co', 'eating_out'],
  ['Kestrel Coffee Bar', 'eating_out'],
  ['Saltbush Noodle House', 'eating_out'],
  ['Ember Grill', 'eating_out'],
  ['Waverly Fuel Stop', 'transport'],
  ['Tramline Fares', 'transport'],
  ['Lantern Rideshare', 'transport'],
  ['Northgate Parking', 'transport'],
  ['Brightfield Power', 'bills'],
  ['Clearwater Utilities', 'bills'],
  ['Skyline Broadband', 'bills'],
  ['Hollis Insurance', 'bills'],
  ['Marlowe Homewares', 'shopping'],
  ['Quillon Books', 'shopping'],
  ['Fernhill Outfitters', 'shopping'],
  ['Pixel Parade Tech', 'shopping'],
  ['Larkspur Pharmacy', 'health'],
  ['Elmgrove Physio', 'health'],
  ['Cobalt Dental', 'health'],
  ['Sunnyvale Optical', 'health'],
  ['Brightwave Payroll', 'income'],
  ['Tidepool Interest', 'income'],
  ['Oakridge Dividends', 'income'],
];

test('the categories are listed in order, with key and label', () => {
  assert.deepEqual(CATEGORIES, [
    { key: 'groceries', label: 'Groceries' },
    { key: 'eating_out', label: 'Eating out' },
    { key: 'transport', label: 'Transport' },
    { key: 'bills', label: 'Bills' },
    { key: 'shopping', label: 'Shopping' },
    { key: 'health', label: 'Health' },
    { key: 'income', label: 'Income' },
    { key: 'other', label: 'Other' },
  ]);
});

test('each shop name maps to its category', () => {
  for (const [shop, category] of SHOP_CATEGORIES) {
    assert.equal(categoryOf(`${shop} 12 HIGH ST`), category, shop);
  }
});

test('a shop name matches in any letter case', () => {
  for (const [shop, category] of SHOP_CATEGORIES) {
    assert.equal(categoryOf(shop.toUpperCase()), category, `upper: ${shop}`);
    assert.equal(categoryOf(shop.toLowerCase()), category, `lower: ${shop}`);
  }
});

test('a description with no shop name is other', () => {
  assert.equal(categoryOf('BANK TRANSFER 42.00'), 'other');
  assert.equal(categoryOf(''), 'other');
});

test('when two shop names both match, the first shop in the list wins', () => {
  const rules = [
    { name: 'Pasta', category: 'eating_out' },
    { name: 'Pasta Bar', category: 'shopping' },
  ];
  assert.equal(categoryOf('PASTA BAR 9 KING ST', rules), 'eating_out');
  assert.equal(categoryOf('Pasta Bar', [...rules].reverse()), 'shopping');
});
