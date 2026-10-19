const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const https = require('node:https');
const { fetchDelegatedStatistics } = require('../dist/sources/fetch-text.js');

function sourceResponse(status, text = '', overrides = {}) {
  return {
    status,
    statusText: status === 200 ? 'OK' : 'Fixture',
    contentType: 'text/plain',
    retryAfter: null,
    text,
    ...overrides,
  };
}

test('retries transient source failures', async () => {
  let calls = 0;
  const request = async () => {
    calls += 1;
    return calls === 1 ? sourceResponse(503) : sourceResponse(200, 'fixture body');
  };

  assert.equal(await fetchDelegatedStatistics('https://example.test/stats', 'afrinic', request), 'fixture body');
  assert.equal(calls, 2);
});

test('does not retry a permanent HTTP error', async () => {
  let calls = 0;
  const request = async () => {
    calls += 1;
    return sourceResponse(404, '', { statusText: 'Not Found' });
  };

  await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic', request), /HTTP 404 Not Found/);
  assert.equal(calls, 1);
});

test('retries 408 and honors a zero Retry-After response', async () => {
  let calls = 0;
  const request = async () => {
    calls += 1;
    if (calls === 1) return sourceResponse(408);
    if (calls === 2) return sourceResponse(429, '', { retryAfter: '0' });
    return sourceResponse(200, 'recovered');
  };

  assert.equal(await fetchDelegatedStatistics('https://example.test/stats', 'afrinic', request), 'recovered');
  assert.equal(calls, 3);
});

test('does not retry a source format/content-type change', async () => {
  let calls = 0;
  const request = async () => {
    calls += 1;
    return sourceResponse(200, '<html>maintenance</html>', { contentType: 'text/html' });
  };

  await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic', request), /Unexpected afrinic content type/);
  assert.equal(calls, 1);
});

test('caps repeated network failures at three attempts', async () => {
  let calls = 0;
  const request = async () => {
    calls += 1;
    throw new TypeError('fixture network error');
  };

  await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic', request), /failed after 3 attempts/);
  assert.equal(calls, 3);
});

test('reports curated nested network causes without printing full errors', async () => {
  const socketError = Object.assign(new Error('socket unavailable'), {
    code: 'EACCES', address: '196.216.2.24', port: 443,
  });
  const request = async () => {
    throw new TypeError('fetch failed', { cause: new AggregateError([socketError]) });
  };

  await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic', request), (error) => {
    assert.match(error.message, /EACCES/);
    assert.match(error.message, /196\.216\.2\.24/);
    assert.match(error.message, /port=443/);
    assert.doesNotMatch(error.message, /stack|secret/i);
    return true;
  });
});

test('uses verified IPv4 HTTPS with the project User-Agent', async () => {
  const originalGet = https.get;
  let observedOptions;
  https.get = (url, options, callback) => {
    observedOptions = options;
    const request = new EventEmitter();
    request.setTimeout = () => request;
    const response = Readable.from(['fixture body']);
    response.statusCode = 200;
    response.statusMessage = 'OK';
    response.headers = { 'content-type': 'text/plain' };
    process.nextTick(() => callback(response));
    return request;
  };

  try {
    assert.equal(await fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), 'fixture body');
    assert.equal(observedOptions.family, 4);
    assert.equal(observedOptions.headers['User-Agent'], 'asn-nigeria/2.0 (+https://github.com/shazzark/asn-nigeria)');
    assert.equal(observedOptions.rejectUnauthorized, undefined);
  } finally {
    https.get = originalGet;
  }
});

test('follows same-origin HTTPS redirects and destroys redirect response bodies', async () => {
  const originalGet = https.get;
  const targets = [];
  const responses = [
    { statusCode: 302, statusMessage: 'Found', headers: { location: '/latest' }, body: 'ignored' },
    { statusCode: 200, statusMessage: 'OK', headers: { 'content-type': 'text/plain' }, body: 'complete data' },
  ];
  https.get = (url, _options, callback) => {
    targets.push(url.href);
    const request = new EventEmitter();
    request.setTimeout = () => request;
    const fixture = responses.shift();
    const response = Readable.from([fixture.body]);
    response.statusCode = fixture.statusCode;
    response.statusMessage = fixture.statusMessage;
    response.headers = fixture.headers;
    process.nextTick(() => callback(response));
    return request;
  };

  try {
    assert.equal(await fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), 'complete data');
    assert.deepEqual(targets, ['https://example.test/stats', 'https://example.test/latest']);
  } finally {
    https.get = originalGet;
  }
});

test('rejects cross-origin HTTPS redirects without contacting the target', async () => {
  const originalGet = https.get;
  let calls = 0;
  https.get = (_url, _options, callback) => {
    calls += 1;
    const request = new EventEmitter();
    request.setTimeout = () => request;
    const response = Readable.from(['ignored']);
    response.statusCode = 302;
    response.statusMessage = 'Found';
    response.headers = { location: 'https://other.example/stats' };
    process.nextTick(() => callback(response));
    return request;
  };

  try {
    await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), /cross-origin source redirect/);
    assert.equal(calls, 1);
  } finally {
    https.get = originalGet;
  }
});

test('rejects HTTPS downgrade redirects without contacting the target', async () => {
  const originalGet = https.get;
  let calls = 0;
  https.get = (_url, _options, callback) => {
    calls += 1;
    const request = new EventEmitter();
    request.setTimeout = () => request;
    const response = Readable.from(['ignored']);
    response.statusCode = 302;
    response.statusMessage = 'Found';
    response.headers = { location: 'http://example.test/stats' };
    process.nextTick(() => callback(response));
    return request;
  };

  try {
    await assert.rejects(fetchDelegatedStatistics('https://example.test/stats', 'afrinic'), /non-HTTPS redirect/);
    assert.equal(calls, 1);
  } finally {
    https.get = originalGet;
  }
});
