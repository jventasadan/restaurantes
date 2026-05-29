const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, image, image_type } = req.body;
    if (!text && !image) return res.status(400).json({ error: "Proporciona texto o imagen." });

    const systemPrompt = `Eres un analizador de cartas de restaurante. Devuelve SOLO un JSON con este formato:
{"menu_items":[{"category":"Entrantes","name":"nombre","description":"desc o null","price":0.00,"price_type":"por unidad","allergens":[],"available":true,"notes":null}]}
No inventes información. Devuelve SOLO el JSON válido.`;

    let content = [];
    if (image) {
      content.push({ type: "image", source: { type: "base64", media_type: image_type || "image/jpeg", data: image } });
      content.push({ type: "text", text: "Analiza esta página del menú y extrae todos los platos." });
    } else {
      content.push({ type: "text", text: `Analiza el siguiente texto de la carta:\n\n${text}` });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Error Claude API: " + errText });
    }

    const claudeResult = await response.json();
    const replyText = claudeResult.content.find(c => c.type === 'text')?.text || "";

    try {
      const cleanJson = replyText.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.status(200).json(JSON.parse(cleanJson));
    } catch (e) {
      return res.status(500).json({ error: "No se pudo parsear el JSON", raw_response: replyText });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
