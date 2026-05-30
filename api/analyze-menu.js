export const config = { runtime: 'edge' };  // Edge function - sin timeout

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') return new Response('', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });

  try {
    const { text, image, image_type } = await req.json();
    if (!text && !image) return new Response(JSON.stringify({ error: 'Proporciona texto o imagen' }), { status: 400, headers: corsHeaders });

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

    // Limpiar el texto de espacios y separadores innecesarios
    const cleanText = text ? text
      .split('\n')
      .map(l => l.replace(/[.·…\-–—]{3,}/g, '-').replace(/\s{3,}/g, ' ').trim())
      .filter(l => l.length > 1)
      .join('\n') : '';

    const systemPrompt = `Extrae platos/vinos de esta carta. Devuelve SOLO JSON válido:
{"menu_items":[{"category":"string","name":"string","description":null,"price":0.00,"price_type":"por unidad","allergens":[],"available":true,"notes":null}]}
Sin markdown, sin texto adicional.`;

    const content = image
      ? [{ type: 'image', source: { type: 'base64', media_type: image_type || 'image/jpeg', data: image } }, { type: 'text', text: 'Extrae todos los platos y precios.' }]
      : [{ type: 'text', text: cleanText }];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
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
      return new Response(JSON.stringify({ error: 'Error Claude: ' + err }), { status: 502, headers: corsHeaders });
    }

    const result = await response.json();
    const replyText = result.content?.find(c => c.type === 'text')?.text || '';
    const cleanJson = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return new Response(JSON.stringify(parsed), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
