// src/lib/csv.js

// Splits one statement line into its fields. Commas inside double quotes stay
// in their field, and a doubled quote inside quotes is one quote. Fields are
// returned as written, without trimming.
export function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch !== '"') field += ch;
      else if (line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = false;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}
