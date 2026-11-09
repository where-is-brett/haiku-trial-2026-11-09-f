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
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
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
