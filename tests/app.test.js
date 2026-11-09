// tests/app.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../src/app.js';

function serve(features) {
  const db = new DatabaseSync(':memory:');
  const server = http.createServer(createApp({ db, features }));
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, db, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

function upload(base, text) {
  const form = new FormData();
  form.append('statement', new Blob([text], { type: 'text/csv' }), 'statement.csv');
  return fetch(`${base}/import`, { method: 'POST', body: form });
}

test('with the flag off, /import is a 404 like any unknown path', async () => {
  const { server, base } = await serve({ statementImport: false });
  try {
    const res = await fetch(`${base}/import`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test('the home page still says nothing is imported when the database is empty', async () => {
  const { server, base } = await serve({ statementImport: false });
  try {
    const body = await (await fetch(`${base}/`)).text();
    assert.match(body, /Nothing imported yet/);
  } finally {
    server.close();
  }
});

test('with the flag on, GET /import shows a file field named statement', async () => {
  const { server, base } = await serve({ statementImport: true });
  try {
    const body = await (await fetch(`${base}/import`)).text();
    assert.match(body, /type="file" name="statement"/);
  } finally {
    server.close();
  }
});

test('uploading a statement shows Added, then Added 0 on the second upload', async () => {
  const { server, base } = await serve({ statementImport: true });
  const statement = 'Date,Description,Amount\n02/08/2026,Hollis Insurance,123.50\n03/08/2026,Lowtide Grocers,5.80\n';
  const upload = async () => {
    const form = new FormData();
    form.append('statement', new Blob([statement], { type: 'text/csv' }), 'statement.csv');
    return (await fetch(`${base}/import`, { method: 'POST', body: form })).text();
  };
  try {
    assert.match(await upload(), /Added 2, skipped 0/);
    assert.match(await upload(), /Added 0, skipped 2/);
  } finally {
    server.close();
  }
});

test('posting without a statement file shows the form again with no result line', async () => {
  const { server, base } = await serve({ statementImport: true });
  try {
    const form = new FormData();
    form.append('note', 'no file here');
    const body = await (await fetch(`${base}/import`, { method: 'POST', body: form })).text();
    assert.match(body, /type="file" name="statement"/);
    assert.doesNotMatch(body, /Added/);
  } finally {
    server.close();
  }
});

test('posting an empty file picker shows the form again with no result line', async () => {
  const { server, base } = await serve({ statementImport: true });
  try {
    const form = new FormData();
    form.append('statement', new Blob([], { type: 'application/octet-stream' }), '');
    const body = await (await fetch(`${base}/import`, { method: 'POST', body: form })).text();
    assert.match(body, /type="file" name="statement"/);
    assert.doesNotMatch(body, /Added/);
  } finally {
    server.close();
  }
});

test('with the flag off, a POST to /import is a 404 and stores nothing', async () => {
  const { server, db, base } = await serve({ statementImport: false });
  try {
    const res = await upload(base, 'Date,Description,Amount\n02/08/2026,Hollis Insurance,123.50\n');
    assert.equal(res.status, 404);
    assert.equal(await res.text(), 'Not found');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
  } finally {
    server.close();
  }
});

test('a file with the wrong header shows the plain message and the form, with a 200', async () => {
  const { server, db, base } = await serve({ statementImport: true });
  try {
    const res = await upload(base, 'Date,Amount\n02/08/2026,123.50\n');
    const body = await res.text();
    assert.equal(res.status, 200);
    assert.match(body, /<p>That file is not a bank statement\. Nothing was added\.<\/p>/);
    assert.match(body, /type="file" name="statement"/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
  } finally {
    server.close();
  }
});

test('a file with a date that does not exist shows the plain message and the form, with a 200', async () => {
  const { server, db, base } = await serve({ statementImport: true });
  try {
    const res = await upload(base, 'Date,Description,Amount\n02/08/2026,Hollis Insurance,123.50\n31/02/2026,Lowtide Grocers,5.80\n');
    const body = await res.text();
    assert.equal(res.status, 200);
    assert.match(body, /<p>That file is not a bank statement\. Nothing was added\.<\/p>/);
    assert.match(body, /type="file" name="statement"/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
  } finally {
    server.close();
  }
});

test('after a refused upload, the home page still says nothing is imported', async () => {
  const { server, base } = await serve({ statementImport: true });
  try {
    await upload(base, 'Date,Description,Amount\n31/02/2026,Lowtide Grocers,5.80\n');
    const body = await (await fetch(`${base}/`)).text();
    assert.match(body, /Nothing imported yet/);
  } finally {
    server.close();
  }
});
