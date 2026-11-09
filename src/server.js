// src/server.js
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const db = new DatabaseSync(process.env.LEDGER_DB ?? 'ledger.db');
const features = {
  statementImport: process.env.FEATURE_STATEMENT_IMPORT === '1',
};

const server = http.createServer(createApp({ db, features }));

server.listen(port, () => {
  console.log(`listening on ${server.address().port}`);
});
