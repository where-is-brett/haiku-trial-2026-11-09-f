// src/import.js
import { parseCsvLine } from './lib/csv.js';
import { parseAmount } from './lib/money.js';
import { parseDate } from './lib/dates.js';

const HEADER_LINE = 'Date,Description,Amount';

// Stores one statement upload. The first non-blank line must be the header, exactly
// as HEADER_LINE, and blank lines are ignored. A row is skipped when a row stored
// before this upload has the same date, description and cents; repeated lines inside
// one upload are all stored. The whole upload is one transaction: every row is
// stored, or none is. A file that is not a statement is refused before anything is written.
export function importStatement(db, text) {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '');
  if (lines[0] !== HEADER_LINE) {
    throw new Error(`not a bank statement: the header must be ${HEADER_LINE}`);
  }
  const rows = lines
    .slice(1)
    .map((line) => {
      const fields = parseCsvLine(line);
      checkDate(fields[0]);
      const cents = parseAmount(fields[2]);
      // A row with no usable amount would be stored as NULL, so the whole upload is refused.
      if (!Number.isFinite(cents)) {
        throw new Error(`row has no amount: ${line}`);
      }
      return {
        date: parseDate(fields[0]),
        description: fields[1].trim(),
        cents,
      };
    });

  db.exec('BEGIN');
  try {
    db.exec(
      'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)',
    );
    const stored = new Set(
      db.prepare('SELECT date, description, cents FROM transactions').all().map(keyOf),
    );
    const insert = db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)');
    let added = 0;
    let skipped = 0;
    for (const row of rows) {
      if (stored.has(keyOf(row))) {
        skipped++;
        continue;
      }
      insert.run(row.date, row.description, row.cents);
      added++;
    }
    db.exec('COMMIT');
    return { added, skipped };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// The three-part rule from the spec: DD/MM/YYYY, with day 1 to 31, month 1 to 12 and
// a four-digit year. The date must also exist in the calendar, so 31/02/2026 is refused.
// parseDate only converts, so the check happens here first.
function checkDate(text) {
  const parts = String(text).trim().split('/');
  const [day, month, year] = parts;
  const inRange =
    parts.length === 3 &&
    /^\d{1,2}$/.test(day) &&
    /^\d{1,2}$/.test(month) &&
    /^\d{4}$/.test(year) &&
    Number(day) >= 1 &&
    Number(day) <= 31 &&
    Number(month) >= 1 &&
    Number(month) <= 12;
  if (!inRange || !existsInCalendar(Number(day), Number(month), Number(year))) {
    throw new Error(`not a bank statement: bad date "${text}"`);
  }
}

// Builds the UTC date from the parts and reads it back. If the day or the month moved,
// the calendar has no such date. setUTCFullYear is used because Date.UTC reads the years
// 0 to 99 as 1900 to 1999, which would refuse 29/02/0000.
function existsInCalendar(day, month, year) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCDate() === day && date.getUTCMonth() === month - 1;
}

// One key per row. JSON keeps the parts apart, so a pipe in a description cannot
// make two different rows look the same.
function keyOf({ date, description, cents }) {
  return JSON.stringify([date, description, cents]);
}
