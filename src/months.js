// src/months.js
// Lists the months that have transactions. A stored date is ISO YYYY-MM-DD, so its
// month is the first seven characters.

// Returns each distinct YYYY-MM that has at least one row, newest first.
// An empty table gives [].
export function listMonths(db) {
  const rows = db
    .prepare('SELECT DISTINCT substr(date, 1, 7) AS month FROM transactions ORDER BY month DESC')
    .all();
  return rows.map((row) => row.month);
}
