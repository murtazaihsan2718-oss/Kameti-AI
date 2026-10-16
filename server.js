// Zero-dependency HTTP server & Backend API proxy for Kameti Mobile App
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Auto-load .env or functions/.env if present
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, 'functions', '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [k, ...v] = trimmed.split('=');
            const key = k.trim();
            const val = v.join('=').trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch (e) {}
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
};

async function handleChatWithAssistant(req, res) {
  return handleJsonApiRequest(req, res, require('./api/chatWithAssistant'), 200 * 1024);
}

async function handleJsonApiRequest(req, res, handler, maxBytes = 4.5 * 1024 * 1024) {
  const response = {
    setHeader: (name, value) => res.setHeader(name, value),
    status(code) { res.statusCode = code; return this; },
    json(body) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(body));
    },
    end: () => res.end(),
  };
  if (req.body !== undefined) return handler(req, response);
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > maxBytes) {
        return response.status(413).json({ success: false, error: 'Request is too large.' });
      }
    }
    req.body = body || '{}';
    return handler(req, response);
  } catch {
    return response.status(400).json({ success: false, error: 'Unable to read the request.' });
  }
}

async function handleTranscribeAudio(req, res) {
  return handleJsonApiRequest(req, res, require('./api/transcribeAudio'));
}

function splitTextIntoTTSChunks(text, maxLen = 180) {
  if (!text) return [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if ((current + ' ' + trimmed).trim().length <= maxLen) {
      current = (current + ' ' + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      if (trimmed.length > maxLen) {
        const words = trimmed.split(' ');
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + ' ' + w).trim().length <= maxLen) {
            wordChunk = (wordChunk + ' ' + w).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        if (wordChunk) current = wordChunk;
        else current = '';
      } else {
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function fetchTTSChunkBuffer(chunkText, lang = 'en') {
  const clean = encodeURIComponent(chunkText);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${clean}`;

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS chunk status ${res.statusCode}`));
      }
      const data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

const ROMAN_TO_URDU_WORDS = {
  'aap': 'آپ', 'ap': 'آپ', 'ki': 'کی', 'kee': 'کی', 'ke': 'کے', 'kay': 'کے', 'ka': 'کا', 'ko': 'کو',
  'hai': 'ہے', 'hain': 'ہیں', 'ho': 'ہو', 'hoga': 'ہوگا', 'hogi': 'ہوگی', 'honge': 'ہوں گے', 'hongay': 'ہوں گے',
  'hoon': 'ہوں', 'hun': 'ہوں', 'hum': 'ہم', 'humein': 'ہمیں', 'main': 'میں', 'mei': 'میں', 'mein': 'میں',
  'meri': 'میری', 'mera': 'میرا', 'mere': 'میرے', 'mujhe': 'مجھے', 'mujhey': 'مجھے',
  'bari': 'باری', 'baari': 'باری', 'paise': 'پیسے', 'paisa': 'پیسے', 'raqam': 'رقم',
  'kitne': 'کتنے', 'kitna': 'کتنا', 'kitnay': 'کتنے', 'kitni': 'کتنی', 'kab': 'کب', 'kahan': 'کہاں',
  'kon': 'کون', 'kaun': 'کون', 'kis': 'کس', 'kisi': 'کسی', 'kiski': 'کس کی',
  'kya': 'کیا', 'kyun': 'کیوں', 'kyu': 'کیوں', 'kaise': 'کیسے', 'kesy': 'کیسے', 'kese': 'کیسے',
  'kist': 'قسط', 'kisht': 'قسط', 'kameti': 'کمیٹی', 'kamaiti': 'کمیٹی', 'committee': 'کمیٹی', 'committees': 'کمیٹیاں',
  'beesi': 'بیسی', 'bisi': 'بیسی', 'bheje': 'بھیجے', 'bhejo': 'بھیجیں', 'jama': 'جمع',
  'nahi': 'نہیں', 'nai': 'نہیں', 'nhi': 'نہیں', 'karega': 'کرے گا', 'karo': 'کرو', 'karna': 'کرنا',
  'karun': 'کروں', 'kar': 'کر', 'karte': 'کرتے', 'batao': 'بتائیں', 'bataiye': 'بتائیں', 'bataen': 'بتائیں',
  'chahiye': 'چاہیے', 'milenge': 'ملیں گے', 'milega': 'ملے گا', 'milna': 'ملنا', 'lena': 'لینا', 'dena': 'دینا', 'dene': 'دینے',
  'tamam': 'تمام', 'sab': 'سب', 'payments': 'ادائیگیاں', 'payment': 'ادائیگی', 'complete': 'مکمل',
  'pending': 'باقی', 'is': 'اس', 'mahine': 'مہینے', 'mahina': 'مہینہ', 'koi': 'کوئی', 'ada': 'ادا',
  'adaigi': 'ادائیگی', 'kul': 'کل', 'payout': 'رقم', 'members': 'ممبران', 'member': 'ممبر',
  'current': 'موجودہ', 'schedule': 'شیڈول', 'intezar': 'انتظار', 'shuru': 'شروع', 'start': 'شروع',
  'active': 'فعال', 'enrolled': 'شامل', 'shamil': 'شامل', 'tareeqa': 'طریقہ', 'tareeqakar': 'طریقہ کار',
  'savings': 'بچت', 'bachat': 'بچت', 'bila': 'بغیر', 'sood': 'سود', 'aasan': 'آسان', 'zariya': 'ذریعہ',
  'pool': 'پول', 'total': 'کل', 'fix': 'مقررہ', 'qura-andazi': 'قرعہ اندازی', 'draw': 'قرعہ اندازی',
  'mutabiq': 'مطابق', 'sari': 'ساری', 'milti': 'ملتی', 'madad': 'مدد', 'sakta': 'سکتا', 'sakti': 'سکتی',
  'chahte': 'چاہتے', 'janna': 'جاننا', 'yeh': 'یہ', 'woh': 'وہ', 'aur': 'اور', 'par': 'پر', 'pe': 'پر',
  'se': 'سے', 'tak': 'تک', 'bhi': 'بھی', 'aik': 'ایک', 'ek': 'ایک', 'do': 'دو', 'teen': 'تین',
  'char': 'چار', 'paanch': 'پانچ', 'status': 'اسٹیٹس', 'details': 'تفصیلات', 'date': 'تاریخ',
  'dates': 'تاریخیں', 'roze': 'دن', 'din': 'دن', 'salam': 'اسلام علیکم', 'assalam': 'اسلام علیکم',
  'shukriya': 'شکریہ', 'thanks': 'شکریہ', 'cycle': 'سائیکل', 'cycles': 'سائیکلز', 'code': 'کوڈ',
  'join': 'جوائن', 'create': 'بنائیں', 'home': 'ہوم', 'screen': 'اسکرین', 'tap': 'ٹیپ',
  'fund': 'فنڈ', 'circle': 'سرکل', 'family': 'فیملی', 'friends': 'دوستوں', 'office': 'آفس',
  'luckydraw': 'قرعہ اندازی', 'recipient': 'وصول کنندہ', 'designated': 'منتخب'
};

function transliterateRomanUrdu(text) {
  if (!text) return '';
  if (/[\u0600-\u06FF]/.test(text)) return text;

  let processed = text;
  processed = processed.replace(/pkr\s*([0-9,]+)/gi, (m, num) => `${num.replace(/,/g, '')} روپے`);
  processed = processed.replace(/rs\.?\s*([0-9,]+)/gi, (m, num) => `${num.replace(/,/g, '')} روپے`);
  processed = processed.replace(/cycle\s*(\d+)\s*of\s*(\d+)/gi, 'سائیکل $1 از $2');
  processed = processed.replace(/due\s*to/gi, 'کو ادا کرنا ہے');

  const tokens = processed.split(/(\s+|[.,!?:;•*()\-—]+)/);
  const result = tokens.map(tok => {
    const cleanTok = tok.toLowerCase().trim();
    if (ROMAN_TO_URDU_WORDS[cleanTok]) {
      return ROMAN_TO_URDU_WORDS[cleanTok];
    }
    return tok;
  });

  return result.join('').replace(/[*_#`~>]/g, '').trim();
}

function isUrduOrRomanUrdu(text, explicitLanguage) {
  if (explicitLanguage === 'ur') return true;
  if (explicitLanguage === 'en') return false;
  if (!text) return false;

  // 1. Urdu Arabic script
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return true;
  }

  // 2. Count distinct Roman Urdu words
  const cleanLower = text.toLowerCase();
  const romanUrduKeywords = new Set([
    'aap', 'aapki', 'aapka', 'aapke', 'apki', 'apka', 'apke', 'meri', 'mera', 'mere',
    'bari', 'baari', 'paise', 'paisa', 'kitne', 'kitna', 'kitnay', 'kitni', 'kist', 'kisht',
    'kahan', 'kaun', 'kiski', 'bheje', 'bhejo', 'jama', 'nahi', 'nhi', 'nai',
    'karega', 'karna', 'karun', 'karein', 'karta', 'karte', 'karti',
    'mujhe', 'mujhey', 'humein', 'batao', 'bataiye', 'bataen', 'chahiye',
    'hogi', 'hoga', 'hain', 'kyun', 'kaise', 'kesy', 'kese', 'milenge', 'milega', 'milna',
    'mahine', 'mahina', 'adaigi', 'intezar', 'shamil', 'tareeqa', 'tareeqakar', 'bachat', 'zariya',
    'kameti', 'kamaiti', 'beesi', 'bisi'
  ]);

  const words = cleanLower.match(/[a-z]+/g) || [];
  let romanUrduWordCount = 0;

  for (const w of words) {
    if (romanUrduKeywords.has(w)) {
      romanUrduWordCount++;
    }
  }

  return romanUrduWordCount >= 2 || (words.length > 0 && romanUrduWordCount / words.length >= 0.15);
}

async function handleTextToSpeech(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    if (body.length > 50000) req.destroy();
  });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const { text, language } = parsed;

      if (!text || typeof text !== 'string' || !text.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'text is required.' }));
      }

      const isUrdu = isUrduOrRomanUrdu(text, language);

      let targetLang = 'en';
      let textToSpeak = text.replace(/[*_#`~>]/g, '').trim();

      if (isUrdu) {
        targetLang = 'ur';
        textToSpeak = transliterateRomanUrdu(textToSpeak);
      }

      const chunks = splitTextIntoTTSChunks(textToSpeak, 180);

      console.log(`[Server Backend] Synthesizing TTS (${chunks.length} chunks, lang: ${targetLang}): "${textToSpeak.slice(0, 40)}..."`);
      const buffers = [];
      for (const chunk of chunks) {
        if (chunk.trim()) {
          const buf = await fetchTTSChunkBuffer(chunk.trim(), targetLang);
          buffers.push(buf);
        }
      }

      const combinedBuffer = Buffer.concat(buffers);
      const audioBase64 = combinedBuffer.toString('base64');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        audioBase64,
        mimeType: 'audio/mp3',
        lang: targetLang,
      }));
    } catch (err) {
      console.error('[Server Backend] TTS synthesis failed:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Failed to synthesize speech audio.' }));
    }
  });
}

const server = http.createServer((req, res) => {
  // CORS Headers & Anti-Caching Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL path
  let reqPath = req.url.split('?')[0];

  // Backend API routes
  if (req.method === 'POST' && (reqPath === '/api/chatWithAssistant' || reqPath === '/chatWithAssistant')) {
    return handleChatWithAssistant(req, res);
  }

  if (req.method === 'POST' && (reqPath === '/api/transcribeAudio' || reqPath === '/transcribeAudio')) {
    return handleTranscribeAudio(req, res);
  }

  if (req.method === 'POST' && (reqPath === '/api/textToSpeech' || reqPath === '/textToSpeech')) {
    return handleTextToSpeech(req, res);
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  // If path doesn't have an extension and exists as directory, check for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        if (!ext || ext === '.html') {
          fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackErr, indexContent) => {
            if (fallbackErr) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(indexContent, 'utf-8');
            }
          });
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`File not found: ${reqPath}`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(` Kameti Mobile App Server is running!`);
  console.log(` Local URL:    http://localhost:${PORT}`);
  console.log(` API Endpoint: http://localhost:${PORT}/api/chatWithAssistant`);
  console.log(` Chat model:   ${process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash-lite'} (with Kameti User Context)`);
  console.log(`==================================================\n`);
});
