const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchDelegatedStatistics } = require('../dist/sources/fetch-text.js');

test('retries transient source failures and includes the honest User-Agent', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (_url, options) => {
    calls.push(options.headers['User-Agent']);
    if (calls.length === 1) return new Response('', { status: 503, statusText: 'Unavailable' });
    return new Response('fixture body', { status: 200, headers: { 'content-type': 'text/plain' } });
  };

  try {
    assert.equal(await fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), 'fixture body');
    assert.equal(calls.length, 2);
    assert.ok(calls[0].includes('asn-nigeria'));
  } finally {
    global.fetch = originalFetch;
  }
});

test('does not retry a permanent HTTP error', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response('', { status: 404, statusText: 'Not Found' });
  };

  try {
    await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), /HTTP 404 Not Found/);
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test('retries 408 and honors a zero Retry-After response', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response('', { status: 408, statusText: 'Request Timeout' });
    if (calls === 2) return new Response('', { status: 429, headers: { 'retry-after': '0' } });
    return new Response('recovered', { status: 200, headers: { 'content-type': 'text/plain' } });
  };

  try {
    assert.equal(await fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), 'recovered');
    assert.equal(calls, 3);
  } finally {
    global.fetch = originalFetch;
  }
});

test('does not retry a source format/content-type change', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response('<html>maintenance</html>', { status: 200, headers: { 'content-type': 'text/html' } });
  };

  try {
    await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), /Unexpected afrinic content type/);
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test('caps repeated network failures at three attempts', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    throw new TypeError('fixture network error');
  };

  try {
    await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), /failed after 3 attempts/);
    assert.equal(calls, 3);
  } finally {
    global.fetch = originalFetch;
  }
});
