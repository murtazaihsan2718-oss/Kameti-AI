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

MANDATORY LANGUAGE MATCHING RULE:
1. IF THE USER TYPES IN ROMAN URDU (e.g. "meri bari kab hai", "mujhe kitne paise dene hain", "kya haal hai", "batao", "kisht", "paisa", "kameti", "kab milega"):
   YOU MUST REPLY EXCLUSIVELY IN NATURAL PAKISTANI ROMAN URDU. NEVER USE ENGLISH WHEN THE USER SPEAKS IN ROMAN URDU.
2. IF THE USER TYPES IN URDU SCRIPT (اردو):
   YOU MUST REPLY EXCLUSIVELY IN URDU SCRIPT.
3. IF THE USER TYPES IN ENGLISH:
   YOU MUST REPLY IN ENGLISH.

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
  const raw = (query || '').trim();
  const q = raw.toLowerCase();
  const committees = userContext?.committees || [];
  const activeCommittees = committees.filter(c => !c.status?.toLowerCase().includes('forming'));

  const isUrduScript = /[\u0600-\u06FF]/.test(raw);
  const isRomanUrdu = /meri|mera|mere|bari|baari|paise|paisa|kitne|kitna|kitnay|kab|kahan|kon|kaun|kis|kisi|kiski|bheje|bhejo|jama|nahi|nai|nhi|karega|karo|karna|karun|mujhe|mujhey|humein|hum|aap|ap|batao|bataiye|bataen|kist|kisht|chahiye|hogi|hoga|hai|hain|kya|kyun|kyu|kaise|kesy|kese|milenge|milega|milna|lena|dena|dene|kitni|kameti|kamaiti|beesi|bisi/.test(q);

  // 1. Dues & Pending contributions
  if (q.includes('owe') || q.includes('due') || q.includes('kitne paise') || q.includes('kitna dena') || q.includes('pending') || q.includes('pay this month') || q.includes('ادائیگی') || q.includes('دینے') || q.includes('کتنے') || q.includes('kisht') || q.includes('jama')) {
    const totalDue = userContext?.totalMonthlyContributionDue || 0;
    if (totalDue === 0 || activeCommittees.length === 0) {
      if (isUrduScript) return 'آپ کی تمام ادائیگیاں مکمل ہیں! اس مہینے کوئی ادائیگی واجب الادا نہیں ہے۔';
      if (isRomanUrdu) return 'Aap ki tamam payments complete hain! Is mahine koi payment pending nahi hai.';
      return 'Great news! You have no pending payments due for this month. All your contributions are up to date.';
    }
    const dueComms = activeCommittees.filter(c => c.userPayment?.paymentStatus === 'pending' && !c.payout?.isUserCurrentRecipient);
    
    if (isUrduScript) {
      const details = dueComms.map(c => `• **${c.committeeName}**: PKR ${c.contributionAmount?.toLocaleString()} (${c.payout?.currentRecipientName || 'وصول کنندہ'} کو ادا کریں)`).join('\n');
      return `آپ کے اس مہینے کل **PKR ${totalDue.toLocaleString()}** واجب الادا ہیں:\n\n${details || 'کوئی بقایا نہیں ہے۔'}`;
    }
    if (isRomanUrdu) {
      const details = dueComms.map(c => `• **${c.committeeName}**: PKR ${c.contributionAmount?.toLocaleString()} (${c.payout?.currentRecipientName || 'Recipient'} ko dena hai)`).join('\n');
      return `Aap ko is mahine kul **PKR ${totalDue.toLocaleString()}** ada karne hain:\n\n${details || 'Koi pending payment nahi hai.'}`;
    }
    const details = dueComms.map(c => `• **${c.committeeName}**: PKR ${c.contributionAmount?.toLocaleString()} (Due to ${c.payout?.currentRecipientName || 'Recipient'})`).join('\n');
    return `You have **PKR ${totalDue.toLocaleString()}** in pending contributions due this month:\n\n${details}`;
  }

  // 2. Payouts & Turns
  if (q.includes('getting paid') || q.includes('payout') || q.includes('receive') || q.includes('meri bari') || q.includes('turn') || q.includes('mujhe kitnay') || q.includes('number') || q.includes('باری') || q.includes('رقم') || q.includes('ملے') || q.includes('milega') || q.includes('milna')) {
    const recipientComms = activeCommittees.filter(c => c.payout?.isUserCurrentRecipient);
    if (recipientComms.length > 0) {
      const totalPayout = recipientComms.reduce((acc, c) => acc + (c.totalPool || 0), 0);
      if (isUrduScript) {
        const details = recipientComms.map(c => `• **${c.committeeName}**: PKR ${c.totalPool?.toLocaleString()} (آپ سائیکل ${c.currentCycle} کے وصول کنندہ ہیں)`).join('\n');
        return `اس مہینے آپ کو کل **PKR ${totalPayout.toLocaleString()}** کی رقم ملنی ہے:\n\n${details}`;
      }
      if (isRomanUrdu) {
        const details = recipientComms.map(c => `• **${c.committeeName}**: PKR ${c.totalPool?.toLocaleString()} (Cycle ${c.currentCycle} of ${c.totalCycles} ka payout aap ko milega)`).join('\n');
        return `Is mahine aap ko kul **PKR ${totalPayout.toLocaleString()}** ka payout milna hai:\n\n${details}`;
      }
      const details = recipientComms.map(c => `• **${c.committeeName}**: PKR ${c.totalPool?.toLocaleString()} (You are the designated recipient for Cycle ${c.currentCycle} of ${c.totalCycles})`).join('\n');
      return `This month, you are scheduled to receive a total payout of **PKR ${totalPayout.toLocaleString()}**:\n\n${details}`;
    }
    
    if (isUrduScript) {
      const upcoming = activeCommittees.map(c => `• **${c.committeeName}**: ${c.payout?.payoutTurnSummary || 'آنے والے سائیکلز میں شیڈول ہے'}`).join('\n');
      return `موجودہ سائیکل میں آپ کو رقم نہیں مل رہی۔ آپ کی باری کا شیڈول درج ذیل ہے:\n\n${upcoming || 'کوئی فعال کمیٹی نہیں ہے۔'}`;
    }
    if (isRomanUrdu) {
      const upcoming = activeCommittees.map(c => `• **${c.committeeName}**: ${c.payout?.payoutTurnSummary || 'Aane wale cycles mein schedule hai'}`).join('\n');
      return `Is current cycle mein aap ki bari nahi hai. Aap ki bari ka status yeh hai:\n\n${upcoming || 'Koi active committee nahi hai.'}`;
    }
    const upcoming = activeCommittees.map(c => `• **${c.committeeName}**: ${c.payout?.payoutTurnSummary || 'Scheduled in upcoming cycles'}`).join('\n');
    return `You are not scheduled for a payout in this current cycle. Here is your turn status:\n\n${upcoming || 'No active committees.'}`;
  }

  // 3. Enrolled committees
  if (q.includes('committee') || q.includes('enrolled') || q.includes('all committees') || q.includes('کمیٹی') || q.includes('کمیٹیاں') || q.includes('kameti')) {
    if (committees.length === 0) {
      if (isUrduScript) return 'آپ ابھی کسی کمیٹی میں شامل نہیں ہیں۔ ہوم اسکرین پر "+ بنائیں" یا "شامل ہوں" پر ٹیپ کریں!';
      if (isRomanUrdu) return 'Aap abhi kisi committee mein shamil nahi hain. Home screen par "+ Create" ya "Join" par tap karein!';
      return 'You are not currently enrolled in any committees. Tap "+ Create" or "Join" on the Home tab to get started!';
    }
    if (isUrduScript) {
      const list = committees.map(c => {
        const isForming = c.status?.toLowerCase().includes('forming');
        return `• **${c.committeeName}** (جوائن کوڈ: \`${c.joinCode}\`)\n  * ماہانہ رقم: PKR ${c.contributionAmount?.toLocaleString()}\n  * کل پول: PKR ${c.totalPool?.toLocaleString()}\n  * اسٹیٹس: ${isForming ? 'ممبرز کا انتظار (ابھی شروع نہیں ہوئی)' : `فعال (سائیکل ${c.currentCycle} از ${c.totalCycles})`}`;
      }).join('\n\n');
      return `آپ کی رجسٹرڈ کمیٹیاں درج ذیل ہیں:\n\n${list}`;
    }
    if (isRomanUrdu) {
      const list = committees.map(c => {
        const isForming = c.status?.toLowerCase().includes('forming');
        return `• **${c.committeeName}** (Join Code: \`${c.joinCode}\`)\n  * Monthly Raqam: PKR ${c.contributionAmount?.toLocaleString()}\n  * Total Pool: PKR ${c.totalPool?.toLocaleString()}\n  * Status: ${isForming ? 'Members ka intezar (Start nahi hui)' : `Active (Cycle ${c.currentCycle} of ${c.totalCycles})`}`;
      }).join('\n\n');
      return `Aap ki enrolled committees yeh hain:\n\n${list}`;
    }
    const list = committees.map(c => {
      const isForming = c.status?.toLowerCase().includes('forming');
      return `• **${c.committeeName}** (Join Code: \`${c.joinCode}\`)\n  * Monthly Contribution: PKR ${c.contributionAmount?.toLocaleString()}\n  * Total Pool: PKR ${c.totalPool?.toLocaleString()}\n  * Status: ${isForming ? 'Waiting for members (Not started)' : `Active (Cycle ${c.currentCycle} of ${c.totalCycles})`}`;
    }).join('\n\n');
    return `Here are your enrolled committees:\n\n${list}`;
  }

  // 4. How Kameti works
  if ((q.includes('how') && (q.includes('work') || q.includes('kameti') || q.includes('beesi') || q.includes('rosca'))) || q.includes('کیسے') || q.includes('kaise') || q.includes('kya hai')) {
    if (isUrduScript) {
      return `**کمیٹی کا طریقہ کار:**\n\n1. **ماہانہ بچت**: تمام ممبران ہر مہینے مقررہ رقم ایک مشترکہ پول میں جمع کرتے ہیں۔\n2. **منصفانہ تقسیم**: ہر سائیکل میں قرعہ اندازی یا شیڈول کے مطابق ایک ممبر کو تمام رقم دی جاتی ہے۔\n3. **بغیر سود بچت**: بغیر کسی سود کے یکمشت بڑی رقم حاصل کرنے کا بہترین روایتی طریقہ!`;
    }
    if (isRomanUrdu) {
      return `**Kameti Ka Tareeqa:**\n\n1. **Monthly Pooling**: Sab members har mahine aik fix raqam jama karte hain.\n2. **Fair Turn**: Har cycle mein kisi aik member ko qura-andazi ya bari ke mutabiq sari raqam milti hai.\n3. **Bila Sood Bachat**: Baghair kisi sood ke bari raqam hasil karne ka aasan zariya!`;
    }
    return `**How Kameti Works:**\n\n1. **Monthly Pooling**: A group of trusted members deposits a fixed monthly contribution into a common pool.\n2. **Fair Turn Allocation**: Each cycle, one member collects the full lump-sum payout (decided fairly via Lucky Draw or schedule).\n3. **Community Savings**: Enables debt-free, zero-interest lump-sum financing for every participant!`;
  }

  // General fallback
  if (isUrduScript) {
    return 'میں آپ کی واجب الادا رقوم، کمیٹی کی باری، ممبران کی تفصیلات اور تاریخوں کے بارے میں بتا سکتا ہوں۔ آپ کیا جاننا چاہتے ہیں؟';
  }
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
