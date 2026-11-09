// tests/money-brackets.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount } from '../src/lib/money.js';

test('a bracketed amount is negative cents', () => {
  assert.equal(parseAmount('(40.00)'), -4000);
});

test('a bracketed amount with spaces inside the brackets is negative cents', () => {
  assert.equal(parseAmount('( 40.00 )'), -4000);
});

test('a plain amount stays positive', () => {
  assert.equal(parseAmount('40.00'), 4000);
});
