// Vercel Serverless Function - Kameti AI API Backend Catchall
const chatHandler = require('./chatWithAssistant');
const transcribeHandler = require('./transcribeAudio');
const ttsHandler = require('./textToSpeech');
const healthHandler = require('./health');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = (req.url || '').toLowerCase();

  if (url.includes('chat') || url.includes('assistant')) {
    return chatHandler(req, res);
  }

  if (url.includes('transcribe') || url.includes('audio')) {
    return transcribeHandler(req, res);
  }

  if (url.includes('speech') || url.includes('tts')) {
    return ttsHandler(req, res);
  }

  return healthHandler(req, res);
};
