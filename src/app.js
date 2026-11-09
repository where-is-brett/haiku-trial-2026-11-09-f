// src/app.js
// Builds the request handler. The database and the feature flags are passed in,
// so tests can run the app against an in-memory database.

import { importStatement, NotAStatementError } from './import.js';
import { listMonths } from './months.js';

function page(body) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Spending tracker</title></head>
<body>
<main>
<h1>Spending tracker</h1>
${body}
</main>
</body>
</html>
`;
}

const importForm =
  '<form method="post" enctype="multipart/form-data" action="/import"><input type="file" name="statement" accept=".csv"><button>Import</button></form>';

// The upload is small, so the whole body is read into one buffer.
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Returns the page to show after an upload: the form again, with the result line
// when a file was sent.
async function handleImport(req, db) {
  // Only a file upload is read as a form; any other POST gets the form back.
  // The media type is compared without case, as HTTP treats media types as case-insensitive.
  const mediaType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (mediaType !== 'multipart/form-data') {
    return page(importForm);
  }
  const body = await readBody(req);
  const request = new Request('http://localhost/import', {
    method: 'POST',
    headers: { 'content-type': req.headers['content-type'] },
    body,
  });
  const form = await request.formData();
  const file = form.get('statement');
  // A browser sends the field with an empty filename when no file was chosen.
  if (!(file instanceof File) || file.name === '') {
    return page(importForm);
  }
  let result;
  try {
    result = importStatement(db, await file.text());
  } catch (err) {
    // A refused file adds nothing, so the form is shown again with the plain message.
    if (err instanceof NotAStatementError) {
      return page(`${importForm}<p>That file is not a bank statement. Nothing was added.</p>`);
    }
    throw err;
  }
  return page(`${importForm}<p>Added ${result.added}, skipped ${result.skipped}</p>`);
}

export function createApp({ db, features }) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)',
  );

  return (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      let body;
      if (features.statementImport) {
        const months = listMonths(db);
        body =
          months.length === 0
            ? '<p>Nothing imported yet</p>'
            : `<ul>${months.map((m) => `<li><a href="/month?m=${m}">${m}</a></li>`).join('')}</ul><p><a href="/import">Import a statement</a></p>`;
      } else {
        const { n } = db.prepare('SELECT COUNT(*) AS n FROM transactions').get();
        body = n === 0 ? '<p>Nothing imported yet</p>' : `<p>${n} transactions imported</p>`;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(body));
      return;
    }
    if (features.statementImport && url.pathname === '/import' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(importForm));
      return;
    }
    if (features.statementImport && url.pathname === '/import' && req.method === 'POST') {
      handleImport(req, db).then(
        (html) => {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          res.end(html);
        },
        (err) => {
          // Any error that is not a refused statement is a server fault and shows as 500.
          console.error(err);
          res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Import failed');
        },
      );
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  };
}
