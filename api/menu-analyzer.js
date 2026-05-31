export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, image, image_type } = req.body;
    if (!text && !image) return res.status(400).json({ error: 'Proporciona texto o imagen' });

    const apiKey = process.env.ANTHROPIC_API_KEY || '';

    // Limpiar texto de separadores y espacios innecesarios
    const cleanText = text ? text
      .split('\n')
      .map(l => l.replace(/[.·…]{3,}/g, ' ').replace(/\s{2,}/g, ' ').trim())
      .filter(l => l.length > 1)
      .join('\n') : '';

    const systemPrompt = `Extrae todos los platos y vinos de esta carta. Devuelve SOLO JSON válido sin markdown:\n{"menu_items":[{"category":"string","name":"string","description":null,"price":0.00,"price_type":"por unidad","allergens":[],"available":true,"notes":null}]}\nSin texto adicional. Si aparecen D.O. o regiones (como RIOJA, RIBERA) úsalas como categoría.`;

    const content = image
      ? [{ type: 'image', source: { type: 'base64', media_type: image_type || 'image/jpeg', data: image } }, { type: 'text', text: 'Extrae todos los platos y precios.' }]
      : [{ type: 'text', text: cleanText }];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Error Claude: ' + err.substring(0, 200) });
    }

    const result = await response.json();
    const replyText = result.content?.find(c => c.type === 'text')?.text || '{}';
    const cleanJson = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('menu-analyzer error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
