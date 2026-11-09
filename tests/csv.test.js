// tests/csv.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvLine } from '../src/lib/csv.js';

test('a plain line splits on commas', () => {
  assert.deepEqual(parseCsvLine('02/08/2026,Hollis Insurance,123.50'), ['02/08/2026', 'Hollis Insurance', '123.50']);
});

test('a comma inside quotes stays in its field', () => {
  assert.deepEqual(parseCsvLine('06/08/2026,"Pasta, Pizza & Co REF 3946",102.29'), ['06/08/2026', 'Pasta, Pizza & Co REF 3946', '102.29']);
});

test('a doubled quote inside quotes is one quote', () => {
  assert.deepEqual(parseCsvLine('01/08/2026,"say ""hi""",1.00'), ['01/08/2026', 'say "hi"', '1.00']);
});
