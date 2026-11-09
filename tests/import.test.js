// tests/import.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { importStatement, NotAStatementError } from '../src/import.js';

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

// A row with an extra comma is not a row of this statement. Its amount would be read from
// the wrong field, so the whole upload is refused and nothing is stored.
test('a row whose field count is not three is refused and stores nothing', () => {
  for (const row of ['02/08/2026,Big Shop,1,234.50', '02/08/2026,Lowtide Grocers']) {
    const db = freshDbWithTable();
    assert.throws(() => importStatement(db, HEADER + row + '\n'), /^Error: not a bank statement: row has \d fields/);
    assert.equal(count(db), 0);
  }
});

test('a quoted description with a comma still imports as three fields', () => {
  const db = freshDbWithTable();
  const text = HEADER + '06/08/2026,"Pasta, Pizza & Co",102.29\n';
  assert.deepEqual(importStatement(db, text), { added: 1, skipped: 0 });
  assert.equal(db.prepare('SELECT description, cents FROM transactions').get().description, 'Pasta, Pizza & Co');
  assert.equal(db.prepare('SELECT cents FROM transactions').get().cents, 10229);
});

test('CRLF line endings and blank lines add no extra rows', () => {
  const db = freshDb();
  const text = 'Date,Description,Amount\r\n02/08/2026,Hollis Insurance,123.50\r\n\r\n03/08/2026,Lowtide Grocers,5.80\r\n\r\n';
  assert.deepEqual(importStatement(db, text), { added: 2, skipped: 0 });
});

// A database with the transactions table already present, as the running app has it.
// The refusal tests use it so that count() reads 0 rather than failing on a missing table.
function freshDbWithTable() {
  const db = freshDb();
  db.exec('CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)');
  return db;
}

test('a file whose header is not exactly Date,Description,Amount is refused and stores nothing', () => {
  for (const header of ['Foo,Bar,Baz\n', 'date,description,amount\n', 'Date,Description,Amount,Extra\n']) {
    const db = freshDbWithTable();
    assert.throws(
      () => importStatement(db, header + '02/08/2026,Hollis Insurance,123.50\n'),
      /^Error: not a bank statement/,
    );
    assert.equal(count(db), 0);
  }
});

test('a file with rows but no header line is refused and stores nothing', () => {
  const db = freshDbWithTable();
  const text = '02/08/2026,Hollis Insurance,123.50\n03/08/2026,Lowtide Grocers,5.80\n';
  assert.throws(() => importStatement(db, text), /^Error: not a bank statement/);
  assert.equal(count(db), 0);
});

test('a bad date 99/99/9999 refuses the whole upload and stores nothing', () => {
  const db = freshDbWithTable();
  const text = HEADER + '02/08/2026,Lowtide Grocers,5.80\n99/99/9999,Hollis Insurance,123.50\n';
  assert.throws(() => importStatement(db, text), /^Error: not a bank statement: bad date/);
  assert.equal(count(db), 0);
});

test('a date with no slashes, 2026-08-15, refuses the whole upload and stores nothing', () => {
  const db = freshDbWithTable();
  const text = HEADER + '02/08/2026,Lowtide Grocers,5.80\n2026-08-15,Hollis Insurance,123.50\n';
  assert.throws(() => importStatement(db, text), /^Error: not a bank statement: bad date/);
  assert.equal(count(db), 0);
});

test('every date outside the three-part rule is refused', () => {
  const badDates = ['32/13/26', 'xx/yy/zzzz', '00/08/2026', '02/00/2026', '02/08/26', '002/08/2026', '02/08/20266', '02/08', '02/08/2026/1', ' '];
  for (const date of badDates) {
    const db = freshDbWithTable();
    assert.throws(
      () => importStatement(db, HEADER + '02/08/2026,Lowtide Grocers,5.80\n' + date + ',Hollis Insurance,123.50\n'),
      /^Error: not a bank statement: bad date/,
    );
    assert.equal(count(db), 0);
  }
});

// A date in the three-part shape that does not exist in the calendar is refused, and
// one such row refuses the whole upload.
test('31/02/2026 refuses the whole upload and stores nothing', () => {
  const db = freshDbWithTable();
  const text = HEADER + '02/08/2026,Lowtide Grocers,5.80\n31/02/2026,Hollis Insurance,123.50\n';
  assert.throws(() => importStatement(db, text), /^Error: not a bank statement/);
  assert.equal(count(db), 0);
});

test('29/02/2026 refuses the whole upload and stores nothing', () => {
  const db = freshDbWithTable();
  const text = HEADER + '02/08/2026,Lowtide Grocers,5.80\n29/02/2026,Hollis Insurance,123.50\n';
  assert.throws(() => importStatement(db, text), /^Error: not a bank statement/);
  assert.equal(count(db), 0);
});

test('31/04/2026 refuses the whole upload and stores nothing', () => {
  const db = freshDbWithTable();
  const text = HEADER + '02/08/2026,Lowtide Grocers,5.80\n31/04/2026,Hollis Insurance,123.50\n';
  assert.throws(() => importStatement(db, text), /^Error: not a bank statement/);
  assert.equal(count(db), 0);
});

test('29/02/2024 is a leap day and is accepted', () => {
  const db = freshDbWithTable();
  const text = HEADER + '29/02/2024,Hollis Insurance,123.50\n';
  assert.deepEqual(importStatement(db, text), { added: 1, skipped: 0 });
});

test('31/12/2026 is the last day of the year and is accepted', () => {
  const db = freshDbWithTable();
  const text = HEADER + '31/12/2026,Hollis Insurance,123.50\n';
  assert.deepEqual(importStatement(db, text), { added: 1, skipped: 0 });
});

// Every refusal is a NotAStatementError, and each one stores nothing.
test('the four refusals are all NotAStatementError and store nothing', () => {
  const cases = [
    ['wrong header', 'Foo,Bar,Baz\n02/08/2026,Hollis Insurance,123.50\n'],
    ['no header', '02/08/2026,Hollis Insurance,123.50\n'],
    ['bad date', HEADER + '99/99/9999,Hollis Insurance,123.50\n'],
    ['no amount', HEADER + '02/08/2026,Lowtide Grocers,\n'],
  ];
  for (const [name, text] of cases) {
    const db = freshDbWithTable();
    assert.throws(() => importStatement(db, text), NotAStatementError, name);
    assert.equal(count(db), 0, name);
  }
});

// A trigger aborts the second insert. Without the transaction the first row would stay.
test('a failure part way through an upload rolls back every row of it', () => {
  const db = freshDbWithTable();
  db.exec(
    "CREATE TRIGGER refuse_boom BEFORE INSERT ON transactions WHEN NEW.description = 'Boom' BEGIN SELECT RAISE(ABORT, 'boom'); END;",
  );
  const text = HEADER + '02/08/2026,Lowtide Grocers,5.80\n03/08/2026,Boom,1.00\n04/08/2026,Hollis Insurance,2.00\n';
  assert.throws(() => importStatement(db, text), /boom/);
  assert.equal(count(db), 0);
});

test('the sample statement imports every data row', () => {
  // Open question: the approved spec says "Added 4, skipped 0". The file has 128 data rows.
  // This test uses the file as it is; see the question raised with the director.
  const db = freshDb();
  const text = readFileSync('data/sample-statement.csv', 'utf8');
  assert.deepEqual(importStatement(db, text), { added: 128, skipped: 0 });
});
