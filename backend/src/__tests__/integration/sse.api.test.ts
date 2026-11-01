import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

describe('SSE Stream (T1-07)', () => {
  it('GET /api/sse connects and streams event-stream headers and welcome event', async () => {
    return new Promise<void>((resolve, reject) => {
      const req = request(app)
        .get('/api/sse')
        .expect('Content-Type', /^text\/event-stream/)
        .expect('Cache-Control', /no-cache/)
        .expect(200);

      req.buffer(false).parse((res, callback) => {
        let rawData = '';
        res.on('data', (chunk: Buffer) => {
          rawData += chunk.toString();
          if (rawData.includes('event: connected')) {
            expect(rawData).toContain('data: {"clientId":');
            res.destroy(); // close connection
            callback(null, rawData);
            resolve();
          }
        });
        res.on('error', (err) => {
          reject(err);
        });
      }).end((err) => {
        if (err && !err.message.includes('aborted')) {
          reject(err);
        }
      });
    });
  });
});
