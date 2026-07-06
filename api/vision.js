// api/vision.js
// Proxy hacia Groq (modelo vision) para el Diagnóstico Visual del sitio.
// En Vercel, seteá esta variable de entorno: GROQ_VISION_API_KEY
//
// NOTA: el nombre del modelo vision de Groq cambia de tanto en tanto
// (deprecations frecuentes). Si este endpoint empieza a devolver error de
// modelo no encontrado, revisá el modelo vision vigente en
// https://console.groq.com/docs/vision y actualizá GROQ_VISION_MODEL abajo
// o la variable de entorno del mismo nombre.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GROQ_VISION_API_KEY en Vercel' });
  }

  // Modelo vision vigente en Groq (verificado julio 2026).
  // Alternativa: 'qwen/qwen3.6-27b'
  const model = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

  try {
    const { image, mimeType, prompt } = req.body || {};
    if (!image || !prompt) {
      return res.status(400).json({ error: 'Faltan "image" o "prompt" en el body' });
    }

    // Groq limita a 4MB el tamaño de un request con imagen en base64.
    // El string base64 pesa ~33% mas que el binario original, asi que
    // chequeamos contra ese limite antes de pegarle a la API.
    const approxBytes = Math.ceil((image.length * 3) / 4);
    const MAX_BASE64_BYTES = 4 * 1024 * 1024;
    if (approxBytes > MAX_BASE64_BYTES) {
      return res.status(413).json({
        error: 'La imagen es muy pesada para el analisis (limite 4MB). Probá con una foto mas liviana o comprimida.'
      });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${image}` } }
            ]
          }
        ],
        temperature: 0.4,
        max_tokens: 800
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(groqRes.status).json({
        error: (data && data.error && data.error.message) || 'Error en la API de Groq (vision)'
      });
    }

    const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    return res.status(200).json({ content });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
