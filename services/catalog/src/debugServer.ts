import { createServer } from 'http';
import type { RequestCounter } from './datasources/openLibrary.js';

/**
 * Development-only HTTP server for measuring the catalog (04.1). `GET /open-library-requests`
 * returns the Open Library requests counted since the last `DELETE /open-library-requests`.
 */
export function createDebugServer(counter: RequestCounter) {
  return createServer((req, res) => {
    if (req.url !== '/open-library-requests' || (req.method !== 'GET' && req.method !== 'DELETE')) {
      res.writeHead(404).end();
      return;
    }
    if (req.method === 'DELETE') counter.reset();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ count: counter.count }));
  });
}
