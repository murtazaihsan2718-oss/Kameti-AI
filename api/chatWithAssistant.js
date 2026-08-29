const https = require('https');

const GEMINI_MODEL = 'gemini-3.5-flash';

function formatUserKametiContext(userContext) {
  if (!userContext || !userContext.committees || userContext.committees.length === 0) {
    const name = userContext?.user?.name || 'User';
    return `USER KAMETI STATUS:\n- User Name: ${name}\n- Total Active Committees: 0.`;
  }

  let text = `CURRENT USER KAMETI DATA (READ-ONLY):\n`;
  text += `- User Name: ${userContext.user?.name || 'User'}\n`;
  text += `- Total Active Committees: ${userContext.totalActiveCommittees}\n`;
  text += `- Total Pending Contributions Due This Month: PKR ${userContext.totalMonthlyContributionDue?.toLocaleString() || '0'}\n\n`;
  text += `--- COMMITTEES DETAIL ---\n`;

  userContext.committees.forEach((c, idx) => {
    const isForming = c.status && c.status.toLowerCase().includes('forming');
    text += `\n[Committee #${idx + 1}: "${c.committeeName}"]\n`;
    text += `  * Join Code: ${c.joinCode}\n`;
    text += `  * Committee Status: ${isForming ? 'WAITING FOR MEMBERS (STILL FORMING)' : 'ACTIVE / IN PROGRESS'}\n`;
    text += `  * Per-Member Monthly Contribution: PKR ${c.contributionAmount?.toLocaleString()}\n`;
    text += `  * Total Payout Pool: PKR ${c.totalPool?.toLocaleString()}\n`;
    text += `  * Cycle Progress: ${isForming ? 'Not started' : `Cycle ${c.currentCycle} of ${c.totalCycles}`}\n`;
    text += `  * Next Due Date: ${c.nextDueDate || (isForming ? 'Will be set when started' : 'Not specified')}\n`;
    text += `  * Payment Status: ${isForming ? 'Not due' : (c.userPayment?.paymentStatus || 'pending')}\n`;
    text += `  * Recipient: ${isForming ? 'None' : c.payout?.currentRecipientName}\n`;
    text += `  * User Payout Status: ${c.payout?.payoutTurnSummary}\n`;
  });

  return text;
}

function buildSystemInstruction(userContext) {
  const contextBlock = formatUserKametiContext(userContext);

  return `You are the Kameti Assistant for the Kameti (کمیٹی) mobile app (ROSCA / Beesi / Chit fund manager in Pakistan).
You understand English, Urdu (اردو), and Pakistani Roman Urdu. Respond in the exact language used by the user.

${contextBlock}

CRITICAL RULES:
1. Explain payout pool vs monthly contribution clearly.
2. If committee is forming, state that dues are not active yet.
3. Be concise and friendly.`;
}

function callGeminiAPI(messages, userContext, apiKey) {
  return new Promise((resolve, reject) => {
    const systemInstruction = buildSystemInstruction(userContext);
    const contents = [];

    const history = messages.slice(0, -1);
    const lastUserMsg = messages[messages.length - 1];

    for (const msg of history) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text || '' }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: lastUserMsg ? lastUserMsg.text : 'Hello' }],
    });

    const payload = JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800,
      },
    });

    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`);

    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(body);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';
              resolve(text);
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Gemini API error: ${res.statusCode} ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
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

  const { messages, userContext } = body || {};
  const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6J6X47Dk-OizvBvLZGHKaAzzRqxNm9BuHdHSa5m5vlOqA';

  try {
    const reply = await callGeminiAPI(messages || [], userContext || null, apiKey);
    return res.status(200).json({ success: true, reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
