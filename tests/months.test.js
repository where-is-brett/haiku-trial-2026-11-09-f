import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { listMonths } from '../src/months.js';

function dbWithDates(dates) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)');
  const insert = db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)');
  for (const date of dates) insert.run(date, 'Shop', 100);
  return db;
}

test('an empty table lists no months', () => {
  assert.deepEqual(listMonths(dbWithDates([])), []);
});

test('months are listed newest first, across a year boundary, each once', () => {
  const db = dbWithDates(['2025-12-31', '2026-01-02', '2026-01-15', '2026-08-02', '2025-12-01']);
  assert.deepEqual(listMonths(db), ['2026-08', '2026-01', '2025-12']);
});
