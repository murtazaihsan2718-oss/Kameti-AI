const https = require('https');

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

function splitTextIntoTTSChunks(text, maxLen = 180) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
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
  return chunks.filter(c => c.trim().length > 0);
}

function fetchTTSChunkBuffer(text, lang) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS failed with status ${res.statusCode}`));
      }
      const data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
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

  const { text, language } = body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const isUrdu = isUrduOrRomanUrdu(text, language);

    let targetLang = 'en';
    let textToSpeak = text.replace(/[*_#`~>]/g, '').trim();

    if (isUrdu) {
      targetLang = 'ur';
      textToSpeak = transliterateRomanUrdu(textToSpeak);
    }

    const chunks = splitTextIntoTTSChunks(textToSpeak, 180);
    const buffers = [];

    for (const chunk of chunks) {
      if (chunk.trim()) {
        const buf = await fetchTTSChunkBuffer(chunk.trim(), targetLang);
        buffers.push(buf);
      }
    }

    const audioBase64 = Buffer.concat(buffers).toString('base64');
    return res.status(200).json({ success: true, audioBase64, mimeType: 'audio/mp3', lang: targetLang });
  } catch (err) {
    console.error('TTS error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
