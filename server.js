// Zero-dependency HTTP server & Backend API proxy for Kameti Mobile App
const http = require('http');
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

// Explicit stable Gemini model with exponential backoff
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
async function callGeminiWithBackoff(requestPayload, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          if (attempt > 0) {
            console.log(`[Server Backend] Request succeeded on retry attempt ${attempt + 1}/${MAX_RETRIES + 1}.`);
          }
          return reply.trim();
        }
        throw new Error('Empty text content received from Gemini');
      }

      const status = response.status;
      const errorBody = await response.text();

      // Permanent client/auth/not-found errors - do NOT retry
      if (status === 400 || status === 401 || status === 403 || status === 404) {
        console.error(`[Server Backend] Permanent error (Status ${status}): ${errorBody.substring(0, 150)}`);
        throw new Error(`Permanent error with status ${status}`);
      }

      // Transient errors (503 High Demand, 429 Rate Limit, 5xx) - retry with exponential backoff + jitter
      if (attempt < MAX_RETRIES) {
        const baseDelay = RETRY_BASE_DELAYS[attempt] || 4000;
        const jitter = Math.floor(Math.random() * (baseDelay * 0.3));
        const totalDelay = baseDelay + jitter;
        console.warn(`[Server Backend] Model ${GEMINI_MODEL} returned status ${status}. Retrying attempt ${attempt + 2}/${MAX_RETRIES + 1} in ${totalDelay}ms...`);
        await sleep(totalDelay);
      } else {
        console.error(`[Server Backend] All ${MAX_RETRIES + 1} attempts exhausted. Last status: ${status}`);
        throw new Error(`Gemini service returned status ${status} after ${MAX_RETRIES + 1} attempts`);
      }
    } catch (err) {
      if (err.message && err.message.startsWith('Permanent error')) {
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        const baseDelay = RETRY_BASE_DELAYS[attempt] || 4000;
        const jitter = Math.floor(Math.random() * 300);
        const totalDelay = baseDelay + jitter;
        console.warn(`[Server Backend] Network/Fetch error (${err.message}). Retrying attempt ${attempt + 2}/${MAX_RETRIES + 1} in ${totalDelay}ms...`);
        await sleep(totalDelay);
      } else {
        console.error(`[Server Backend] All ${MAX_RETRIES + 1} attempts failed. Last error: ${err.message}`);
        throw err;
      }
    }
  }

  throw new Error('Gemini request failed after retries');
}

async function handleChatWithAssistant(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    if (body.length > 50000) {
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const { message, conversationHistory, userContext } = parsed;

      // 1. Validation
      if (!message || typeof message !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Message is required and must be a string.' }));
      }

      const trimmed = message.trim();
      if (!trimmed) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Message cannot be empty.' }));
      }

      if (trimmed.length > 1000) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Message exceeds maximum length of 1000 characters.' }));
      }

      // 2. Secret Key
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.error('[Server Backend] Missing GEMINI_API_KEY in environment.');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: "Sorry, I couldn't connect to the assistant right now. Please check your GEMINI_API_KEY." }));
      }

      // 3. Build contents
      const contents = [];
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recent = conversationHistory.slice(-6);
        for (const m of recent) {
          if (m && m.text && typeof m.text === 'string' && m.text.trim()) {
            contents.push({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.text.trim() }],
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: trimmed }],
      });

      const systemInstructionText = buildSystemInstruction(userContext);

      const requestPayload = {
        system_instruction: {
          parts: [{ text: systemInstructionText }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      };

      const reply = await callGeminiWithBackoff(requestPayload, apiKey);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, response: reply }));
    } catch (err) {
      console.error('[Server Backend] Request processing failed:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: "Sorry, I couldn't connect to the assistant right now. Please try again." }));
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
  console.log(` Model:        gemini-3.5-flash (with Kameti User Context)`);
  console.log(`==================================================\n`);
});
