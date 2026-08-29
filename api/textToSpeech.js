const https = require('https');

function splitTextIntoTTSChunks(text, maxLen = 180) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if ((current + ' ' + trimmed).length <= maxLen) {
      current = current ? current + ' ' + trimmed : trimmed;
    } else {
      if (current) chunks.push(current);
      current = trimmed;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function fetchTTSChunkBuffer(text, lang) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS failed with status ${res.statusCode}`));
      }
      const data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {}
  }

  const { text, language = 'en' } = body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const lang = language === 'ur' ? 'ur' : 'en';
    const cleanText = text.replace(/[*_#`~>]/g, '').trim();
    const chunks = splitTextIntoTTSChunks(cleanText, 180);
    const buffers = [];

    for (const chunk of chunks) {
      const buf = await fetchTTSChunkBuffer(chunk, lang);
      buffers.push(buf);
    }

    const audioBase64 = Buffer.concat(buffers).toString('base64');
    return res.status(200).json({ success: true, audioBase64, mimeType: 'audio/mp3' });
  } catch (err) {
    console.error('TTS error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
