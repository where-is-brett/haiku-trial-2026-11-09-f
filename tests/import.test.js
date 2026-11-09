// tests/import.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { importStatement } from '../src/import.js';

const HEADER = 'Date,Description,Amount\n';

function freshDb() {
  return new DatabaseSync(':memory:');
}

function count(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
}

test('a bracketed amount is stored as negative cents', () => {
  const db = freshDb();
  importStatement(db, HEADER + '15/09/2026,Marlowe Homewares REFUND,(40.00)\n');
  assert.equal(db.prepare('SELECT cents FROM transactions').get().cents, -4000);
});

test('a first upload adds its rows and a second upload of the same file skips them', () => {
  const db = freshDb();
  const text = HEADER + '02/08/2026,Hollis Insurance,123.50\n03/08/2026,Lowtide Grocers,5.80\n';
  assert.deepEqual(importStatement(db, text), { added: 2, skipped: 0 });
  assert.deepEqual(importStatement(db, text), { added: 0, skipped: 2 });
  assert.equal(count(db), 2);
});

test('two identical lines in one file are both stored on the first upload', () => {
  const db = freshDb();
  const text = HEADER + '02/08/2026,Lowtide Grocers,5.80\n02/08/2026,Lowtide Grocers,5.80\n';
  assert.deepEqual(importStatement(db, text), { added: 2, skipped: 0 });
});

test('a second upload that adds one new line adds only that line', () => {
  const db = freshDb();
  importStatement(db, HEADER + '02/08/2026,Hollis Insurance,123.50\n');
  const result = importStatement(db, HEADER + '02/08/2026,Hollis Insurance,123.50\n03/08/2026,Lowtide Grocers,5.80\n');
  assert.deepEqual(result, { added: 1, skipped: 1 });
});

test('a thousands comma inside quotes is read as cents', () => {
  const db = freshDb();
  importStatement(db, HEADER + '02/08/2026,"Big Shop","1,234.50"\n');
  assert.equal(db.prepare('SELECT cents FROM transactions').get().cents, 123450);
});

test('a row with no usable amount refuses the whole upload and stores nothing', () => {
  const rows = [
    '02/08/2026,Lowtide Grocers,',
    '02/08/2026,Lowtide Grocers',
    '02/08/2026,Lowtide Grocers,abc',
  ];
  for (const row of rows) {
    const db = freshDb();
    // The table exists before the import, as it does in the running app.
    db.exec('CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)');
    assert.throws(() => importStatement(db, HEADER + row + '\n'), /no amount/);
    assert.equal(count(db), 0);
  }
});

test('CRLF line endings and blank lines add no extra rows', () => {
  const db = freshDb();
  const text = 'Date,Description,Amount\r\n02/08/2026,Hollis Insurance,123.50\r\n\r\n03/08/2026,Lowtide Grocers,5.80\r\n\r\n';
  assert.deepEqual(importStatement(db, text), { added: 2, skipped: 0 });
});

test('the sample statement imports every data row', () => {
  // Open question: the approved spec says "Added 4, skipped 0". The file has 128 data rows.
  // This test uses the file as it is; see the question raised with the director.
  const db = freshDb();
  const text = readFileSync('data/sample-statement.csv', 'utf8');
  assert.deepEqual(importStatement(db, text), { added: 128, skipped: 0 });
});
