// api/chat.js
// Proxy hacia Groq para el Concierge / Advisor de chat del sitio.
// En Vercel, seteá esta variable de entorno: GROQ_CHAT_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_CHAT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GROQ_CHAT_API_KEY en Vercel' });
  }

  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Falta el array "messages" en el body' });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.6,
        max_tokens: 700
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(groqRes.status).json({
        error: (data && data.error && data.error.message) || 'Error en la API de Groq'
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
