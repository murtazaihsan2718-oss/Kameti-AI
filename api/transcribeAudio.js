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

  const { language = 'en' } = body || {};
  const simulatedText = language === 'ur'
    ? 'میری اس مہینے کی کمیٹی کی ادائیگی کتنی ہے؟'
    : 'How much do I have to pay in total this month?';

  return res.status(200).json({ success: true, text: simulatedText, language });
};
