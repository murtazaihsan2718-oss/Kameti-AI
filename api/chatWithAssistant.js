const https = require('https');

const GEMINI_MODEL = 'gemini-2.5-flash';

function formatUserKametiContext(userContext) {
  if (!userContext || !userContext.committees || userContext.committees.length === 0) {
    const name = userContext?.user?.name || 'User';
    return `USER KAMETI STATUS:\n- User Name: ${name}\n- Total Active Committees: 0 (The user currently has no active committees).`;
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
    text += `  * Committee Status: ${isForming ? 'WAITING FOR MEMBERS (STILL FORMING - NO DUES YET)' : 'ACTIVE / IN PROGRESS'}\n`;
    text += `  * Per-Member Monthly Contribution: PKR ${c.contributionAmount?.toLocaleString()}\n`;
    text += `  * Total Payout Pool: PKR ${c.totalPool?.toLocaleString()}\n`;
    text += `  * Cycle Progress: ${isForming ? 'Not started (waiting for slots to fill)' : `Cycle ${c.currentCycle} of ${c.totalCycles}`}\n`;
    text += `  * Next Due Date: ${c.nextDueDate || (isForming ? 'Will be set when committee starts' : 'Not specified')}\n`;
    text += `  * User Payment Status for Current Cycle: ${isForming ? 'Not due (committee forming)' : (c.userPayment?.paymentStatus || 'pending')}\n`;
    text += `  * Current Cycle Recipient: ${isForming ? 'None' : c.payout?.currentRecipientName}\n`;
    text += `  * User Payout Status & Turn: ${c.payout?.payoutTurnSummary}\n`;
  });

  return text;
}

function buildSystemInstruction(userContext) {
  const contextBlock = formatUserKametiContext(userContext);

  return `You are the Kameti Assistant, an expert, helpful, and concise assistant for the Kameti (کمیٹی) mobile app — an informal savings committee (ROSCA / Beesi / Chit fund) manager in Pakistan.
You understand English, Urdu (اردو), and Pakistani Roman Urdu.
Always respond in the same language and style that the user used.

${contextBlock}

CRITICAL RULES & GROUNDING INSTRUCTIONS:
1. UNDERSTAND KAMETI FINANCES ACCURATELY:
   - "Monthly Contribution" is the fixed amount that each individual member deposits each month (e.g. PKR 15,000).
   - "Total Pool / Payout Amount" is the entire lump sum collected from all members and awarded to ONE recipient that cycle (e.g. PKR 60,000 = 4 members * 15,000).
   - When the user asks "How much will I receive / Mujhe kitnay milain ge?", the payout amount is ALWAYS the Total Pool (e.g. PKR 60,000), NOT the individual monthly contribution!

2. FORMING COMMITTEES (WAITING FOR MEMBERS):
   - Any committee marked "WAITING FOR MEMBERS / STILL FORMING" has NOT started yet!
   - For forming committees, NO money is due from anyone, and NO payout is scheduled until all slots fill up and the lucky draw begins.
   - If the user has 0 active committees, politely inform them that they haven't created or joined an active committee yet.

3. CONCISE & POLISHED:
   - Keep answers clear, direct, and under 3-4 bullet points or 2 short paragraphs.`;
}

function generateSmartFallbackResponse(query, userContext) {
  const q = (query || '').toLowerCase().trim();
  const committees = userContext?.committees || [];
  const activeCommittees = committees.filter(c => !c.status?.toLowerCase().includes('forming'));
  const isRomanUrdu = /meri|mera|bari|paise|kitne|kab|kon|kis|bheje|jama|nahi|karega|karo|kaun|mujhe/.test(q);

  // 1. Dues & Pending contributions
  if (q.includes('owe') || q.includes('due') || q.includes('kitne paise') || q.includes('kitna dena') || q.includes('pending') || q.includes('pay this month')) {
    const totalDue = userContext?.totalMonthlyContributionDue || 0;
    if (totalDue === 0 || activeCommittees.length === 0) {
      if (isRomanUrdu) return 'Aap ki tamam payments complete hain! Is mahine koi payment pending nahi hai.';
      return 'Great news! You have no pending payments due for this month. All your contributions are up to date.';
    }
    const dueComms = activeCommittees.filter(c => c.userPayment?.paymentStatus === 'pending' && !c.payout?.isUserCurrentRecipient);
    const details = dueComms.map(c => `• **${c.committeeName}**: PKR ${c.contributionAmount?.toLocaleString()} (Due to ${c.payout?.currentRecipientName || 'Recipient'})`).join('\n');
    return `You have **PKR ${totalDue.toLocaleString()}** in pending contributions due this month:\n\n${details || 'No pending payments.'}`;
  }

  // 2. Payouts & Turns
  if (q.includes('getting paid') || q.includes('payout') || q.includes('receive') || q.includes('meri bari') || q.includes('turn') || q.includes('mujhe kitnay') || q.includes('number')) {
    const recipientComms = activeCommittees.filter(c => c.payout?.isUserCurrentRecipient);
    if (recipientComms.length > 0) {
      const details = recipientComms.map(c => `• **${c.committeeName}**: PKR ${c.totalPool?.toLocaleString()} (You are the designated recipient for Cycle ${c.currentCycle} of ${c.totalCycles})`).join('\n');
      const totalPayout = recipientComms.reduce((acc, c) => acc + (c.totalPool || 0), 0);
      return `This month, you are scheduled to receive a total payout of **PKR ${totalPayout.toLocaleString()}**:\n\n${details}`;
    }
    const upcoming = activeCommittees.map(c => `• **${c.committeeName}**: ${c.payout?.payoutTurnSummary || 'Scheduled in upcoming cycles'}`).join('\n');
    return `You are not scheduled for a payout in this current cycle. Here is your turn status:\n\n${upcoming || 'No active committees.'}`;
  }

  // 3. Enrolled committees
  if (q.includes('committee') || q.includes('enrolled') || q.includes('all committees')) {
    if (committees.length === 0) {
      return 'You are not currently enrolled in any committees. Tap "+ Create" or "Join" on the Home tab to get started!';
    }
    const list = committees.map(c => {
      const isForming = c.status?.toLowerCase().includes('forming');
      return `• **${c.committeeName}** (Join Code: \`${c.joinCode}\`)\n  * Monthly Contribution: PKR ${c.contributionAmount?.toLocaleString()}\n  * Total Pool: PKR ${c.totalPool?.toLocaleString()}\n  * Status: ${isForming ? 'Waiting for members (Not started)' : `Active (Cycle ${c.currentCycle} of ${c.totalCycles})`}`;
    }).join('\n\n');
    return `Here are your enrolled committees:\n\n${list}`;
  }

  // 4. How Kameti works
  if (q.includes('how') && (q.includes('work') || q.includes('kameti') || q.includes('beesi') || q.includes('rosca'))) {
    return `**How Kameti Works:**\n\n1. **Monthly Pooling**: A group of trusted members deposits a fixed monthly contribution into a common pool.\n2. **Fair Turn Allocation**: Each cycle, one member collects the full lump-sum payout (decided fairly via Lucky Draw or schedule).\n3. **Community Savings**: Enables debt-free, zero-interest lump-sum financing for every participant!`;
  }

  // General fallback
  if (isRomanUrdu) {
    return 'Main aap ki pending payments, bari ka turn, aur committee ke members ke bare mein madad kar sakta hoon. Aap kya janna chahte hain?';
  }
  return 'I can help you check your pending payments, payout turn, committee member statuses, or next payout date. What would you like to know?';
}

function callGeminiAPI(messagesList, userContext, apiKey) {
  return new Promise((resolve, reject) => {
    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      return reject(new Error('Invalid Gemini API Key format'));
    }

    const systemInstruction = buildSystemInstruction(userContext);
    const contents = [];

    const history = messagesList.slice(0, -1);
    const lastUserMsg = messagesList[messagesList.length - 1];

    for (const msg of history) {
      if (msg && msg.text) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(msg.text) }],
        });
      }
    }

    const queryText = lastUserMsg && lastUserMsg.text ? String(lastUserMsg.text) : 'Hello';
    contents.push({
      role: 'user',
      parts: [{ text: queryText }],
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
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                return resolve(text);
              }
              reject(new Error('Empty Gemini response'));
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

  const { message, messages, conversationHistory, userContext } = body || {};
  
  const userText = (message || (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.text : '') || '').trim();

  if (!userText) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  const history = Array.isArray(conversationHistory) 
    ? conversationHistory 
    : (Array.isArray(messages) ? messages.slice(0, -1) : []);

  const fullMessages = [...history, { sender: 'user', text: userText }];

  const apiKey = process.env.GEMINI_API_KEY || '';

  try {
    const reply = await callGeminiAPI(fullMessages, userContext || null, apiKey);
    return res.status(200).json({ 
      success: true, 
      response: reply, 
      reply: reply 
    });
  } catch (err) {
    console.warn('[Vercel AI Backend] Fallback to smart context response:', err.message);
    const fallback = generateSmartFallbackResponse(userText, userContext);
    return res.status(200).json({ 
      success: true, 
      response: fallback, 
      reply: fallback 
    });
  }
};
