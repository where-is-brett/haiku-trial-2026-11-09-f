// src/import.js
import { parseCsvLine } from './lib/csv.js';
import { parseAmount } from './lib/money.js';
import { parseDate } from './lib/dates.js';

// Stores one statement upload. The first non-blank line is the header and blank
// lines are ignored. A row is skipped when a row stored before this upload has the
// same date, description and cents; repeated lines inside one upload are all stored.
// The whole upload is one transaction: every row is stored, or none is.
export function importStatement(db, text) {
  const rows = text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '')
    .slice(1)
    .map((line) => {
      const fields = parseCsvLine(line);
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

// One key per row. JSON keeps the parts apart, so a pipe in a description cannot
// make two different rows look the same.
function keyOf({ date, description, cents }) {
  return JSON.stringify([date, description, cents]);
}
