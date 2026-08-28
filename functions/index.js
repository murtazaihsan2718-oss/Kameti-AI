const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const GEMINI_MODEL = 'gemini-3.5-flash';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAYS = [1000, 2000, 4000];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formats user-scoped Kameti data into a compact context summary for Gemini
 */
function formatUserKametiContext(userContext) {
  if (!userContext || !userContext.committees || userContext.committees.length === 0) {
    const name = userContext?.user?.name || 'User';
    return `USER KAMETI STATUS:
- User Name: ${name}
- Total Active Committees: 0 (The user is not currently enrolled in any active committees).`;
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
    text += `  * Committee Status: ${isForming ? 'WAITING FOR MEMBERS (STILL FORMING - NOT STARTED YET)' : 'ACTIVE / IN PROGRESS'}\n`;
    text += `  * Per-Member Monthly Contribution: PKR ${c.contributionAmount?.toLocaleString()}\n`;
    text += `  * Total Payout Pool (Lump sum given to the recipient of each cycle): PKR ${c.totalPool?.toLocaleString()}\n`;
    text += `  * Cycle Progress: ${isForming ? 'Not started (waiting for slots to fill)' : `Cycle ${c.currentCycle} of ${c.totalCycles}`}\n`;
    text += `  * Next Payment Due Date: ${c.nextDueDate || (isForming ? 'Will be set when committee starts' : 'Not specified')}\n`;
    text += `  * User's Payment Status for Current Cycle: ${isForming ? 'Not due (committee not started)' : (c.userPayment?.paymentStatus || 'pending')}\n`;
    text += `  * Current Cycle Payout Recipient: ${isForming ? 'None (Committee not started yet)' : c.payout?.currentRecipientName}\n`;
    text += `  * User's Payout Status & Turn: ${c.payout?.payoutTurnSummary}\n`;
    if (c.otherMembers && c.otherMembers.length > 0) {
      text += `  * Other Members: ${c.otherMembers.map(m => m.name).join(', ')}\n`;
    }
  });

  return text;
}

/**
 * Builds the comprehensive Gemini system prompt with user context
 */
function buildSystemInstruction(userContext) {
  const contextBlock = formatUserKametiContext(userContext);

  return `You are the Kameti Assistant, an expert, helpful, and concise assistant for the Kameti (کمیٹی) mobile app — an informal savings committee (ROSCA / Beesi / Chit fund) manager in Pakistan.
You understand English, Urdu (اردو), and Pakistani Roman Urdu.
Always respond in the same language and style that the user used (e.g., if the user asks in Roman Urdu, reply naturally in Roman Urdu; if in English, reply in English; if in Urdu script, reply in Urdu script).

${contextBlock}

CRITICAL RULES & GROUNDING INSTRUCTIONS:
1. UNDERSTAND KAMETI FINANCES ACCURATELY:
   - "Monthly Contribution" is the fixed amount that each individual member deposits each month (e.g. PKR 15,000).
   - "Total Pool / Payout Amount" is the entire lump sum collected from all members and awarded to ONE recipient that cycle (e.g. PKR 60,000 = 4 members * 15,000).
   - When the user asks "How much will I receive / Mujhe kitnay milain ge?", the payout amount is ALWAYS the Total Pool (e.g. PKR 60,000), NOT the individual monthly contribution!

2. FORMING COMMITTEES (WAITING FOR MEMBERS):
   - Any committee marked "WAITING FOR MEMBERS / STILL FORMING" has NOT started yet!
   - For forming committees, NO money is due from anyone, and NO payout is scheduled or being distributed until all slots fill up and the lucky draw / cycle begins.
   - If the user asks about payouts or dues, clearly explain that forming committees haven't started yet.

3. ACCURACY & INTEGRITY:
   - You are a strictly READ-ONLY assistant.
   - Only state numbers, names, and statuses present in the supplied context above.
   - NEVER invent or assume numbers, and do not double-count committees.
   - If the user asks a question and the data is not in the context, politely state that you do not have that record.
   - You CANNOT execute financial transactions or modify settings.`;
}

/**
 * Call Gemini API with exponential backoff and jitter for transient errors
 */
async function callGeminiAPI(message, conversationHistory, userContext, apiKey) {
  const contents = [];

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      if (msg && msg.text && typeof msg.text === 'string' && msg.text.trim()) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text.trim() }],
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message.trim() }],
  });

  const systemInstructionText = buildSystemInstruction(userContext);

  const requestPayload = {
    system_instruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) {
          if (attempt > 0) {
            console.log(`[Backend Gemini] Request succeeded on retry attempt ${attempt + 1}/${MAX_RETRIES + 1}.`);
          }
          return responseText.trim();
        }
        throw new Error('Empty text content received from Gemini');
      }

      const status = response.status;
      const errorBody = await response.text();

      // Permanent client/auth/not-found errors - do NOT retry
      if (status === 400 || status === 401 || status === 403 || status === 404) {
        console.error(`[Backend Gemini] Permanent error (Status ${status}): ${errorBody.substring(0, 150)}`);
        throw new Error(`Permanent error with status ${status}`);
      }

      // Transient errors (503 High Demand, 429 Rate Limit, 5xx) - retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        const baseDelay = RETRY_BASE_DELAYS[attempt] || 4000;
        const jitter = Math.floor(Math.random() * (baseDelay * 0.3));
        const totalDelay = baseDelay + jitter;
        console.warn(`[Backend Gemini] Model ${GEMINI_MODEL} returned status ${status}. Retrying attempt ${attempt + 2}/${MAX_RETRIES + 1} in ${totalDelay}ms...`);
        await sleep(totalDelay);
      } else {
        console.error(`[Backend Gemini] All ${MAX_RETRIES + 1} attempts exhausted. Last status: ${status}`);
        throw new Error(`Gemini returned status ${status} after ${MAX_RETRIES + 1} attempts`);
      }
    } catch (err) {
      if (err.message && err.message.startsWith('Permanent error')) {
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        const baseDelay = RETRY_BASE_DELAYS[attempt] || 4000;
        const jitter = Math.floor(Math.random() * 300);
        const totalDelay = baseDelay + jitter;
        console.warn(`[Backend Gemini] Network/Fetch error (${err.message}). Retrying attempt ${attempt + 2}/${MAX_RETRIES + 1} in ${totalDelay}ms...`);
        await sleep(totalDelay);
      } else {
        console.error(`[Backend Gemini] All ${MAX_RETRIES + 1} attempts failed. Last error: ${err.message}`);
        throw err;
      }
    }
  }

  throw new Error('Gemini service temporarily unavailable');
}

/**
 * Cloud Function endpoint: chatWithAssistant
 */
exports.chatWithAssistant = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  res.set('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    });
  }

  try {
    const { message, conversationHistory, userContext } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string.',
      });
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty.',
      });
    }

    if (trimmed.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds maximum permitted length of 1000 characters.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[Backend Gemini] Missing GEMINI_API_KEY.');
      return res.status(500).json({
        success: false,
        error: "Sorry, I couldn't connect to the assistant right now. Please try again.",
      });
    }

    const assistantReply = await callGeminiAPI(trimmed, conversationHistory, userContext, apiKey);

    return res.status(200).json({
      success: true,
      response: assistantReply,
    });
  } catch (err) {
    console.error('[Backend Gemini] Internal execution error:', err.message);
    return res.status(500).json({
      success: false,
      error: "Sorry, I couldn't connect to the assistant right now. Please try again.",
    });
  }
});
