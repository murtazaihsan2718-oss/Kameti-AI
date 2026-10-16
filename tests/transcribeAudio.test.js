const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/transcribeAudio');

function response() {
  return { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, end() { return this; } };
}

test('transcription endpoint validates recordings, forwards audio, and reports provider failures', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalModel = process.env.GEMINI_TRANSCRIPTION_MODEL;
  delete process.env.GEMINI_TRANSCRIPTION_MODEL;
  const invoke = async (body, method = 'POST') => {
    const res = response(); await handler({ method, body }, res); return res;
  };
  try {
    global.fetch = async () => { throw new Error('Validation must not call Gemini'); };
    assert.equal((await invoke({}, 'OPTIONS')).statusCode, 204);
    assert.equal((await invoke({}, 'GET')).statusCode, 405);
    assert.equal((await invoke('{')).statusCode, 400);
    assert.equal((await invoke({})).statusCode, 400);
    assert.equal((await invoke({ audioBase64: '!!invalid' })).statusCode, 400);
    assert.equal((await invoke({ audioBase64: 'YQ==', mimeType: 'text/plain' })).statusCode, 400);
    assert.equal((await invoke({ audioBase64: 'A'.repeat(4 * 1024 * 1024 + 4) })).statusCode, 413);
    delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY;
    assert.equal((await invoke({ audioBase64: 'YQ==' })).statusCode, 503);
    process.env.GEMINI_API_KEY = 'test-only';
    for (const transcript of ['Who is the next recipient?', 'میری باری کب ہے؟', 'Meri kisht kitni hai?']) {
      global.fetch = async (url, options) => {
        assert.ok(url.endsWith('/gemini-3.5-flash:generateContent'));
        const payload = JSON.parse(options.body);
        assert.deepEqual(payload.contents[0].parts[0].inlineData, { mimeType: 'audio/wav', data: 'YQ==' });
        assert.equal(options.headers['x-goog-api-key'], 'test-only');
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: transcript }] } }] }) };
      };
      const res = await invoke(JSON.stringify({ audioBase64: 'data:audio/wav;base64,YQ==', mimeType: 'audio/wav' }));
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.text, transcript);
    }
    global.fetch = async () => ({ ok: true, json: async () => ({ candidates: [] }) });
    assert.equal((await invoke({ audioBase64: 'YQ==' })).statusCode, 422);
    let attempts = 0;
    global.fetch = async () => ++attempts === 1
      ? { ok: false, status: 503 }
      : { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Who is next?' }] } }] }) };
    assert.equal((await invoke({ audioBase64: 'YQ==' })).body.text, 'Who is next?');
    assert.equal(attempts, 2);
    global.fetch = async () => ({ ok: false, status: 429 });
    const failed = await invoke({ audioBase64: 'YQ==' });
    assert.equal(failed.statusCode, 502); assert.equal(failed.body.success, false);
    global.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError'); };
    assert.equal((await invoke({ audioBase64: 'YQ==' })).statusCode, 502);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
    if (originalGoogleKey === undefined) delete process.env.GOOGLE_API_KEY; else process.env.GOOGLE_API_KEY = originalGoogleKey;
    if (originalModel === undefined) delete process.env.GEMINI_TRANSCRIPTION_MODEL; else process.env.GEMINI_TRANSCRIPTION_MODEL = originalModel;
  }
});
