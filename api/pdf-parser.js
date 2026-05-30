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

    const systemPrompt = `Devuelve SOLO JSON sin markdown: {"menu_items":[{"category":"cat","name":"nombre","description":null,"price":0.00,"price_type":"por unidad","allergens":[],"available":true,"notes":null}]}. Sin texto extra.`;

    const content = image
      ? [{ type: "image", source: { type: "base64", media_type: image_type || "image/jpeg", data: image } }, { type: "text", text: "Extrae todos los platos." }]
      : [{ type: "text", text: `Carta:\n${text}` }];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4096, system: systemPrompt, messages: [{ role: "user", content }] }),
    });

    if (!response.ok) return res.status(502).json({ error: "Error Claude API" });

    const claudeResult = await response.json();
    const replyText = claudeResult.content.find(c => c.type === 'text')?.text || "";
    const cleanJson = replyText.replace(/```json/g, "").replace(/```/g, "").trim();
    return res.status(200).json(JSON.parse(cleanJson));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
