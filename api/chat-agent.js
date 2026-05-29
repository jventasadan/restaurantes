import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { restaurant_id, table_id, session_id, message, history = [] } = req.body;

    if (!restaurant_id || !table_id || !session_id || !message) {
      return res.status(400).json({ error: "Faltan parametros requeridos" });
    }

    const { data: restaurant, error: rError } = await supabase
      .from('restaurants').select('*').eq('restaurant_id', restaurant_id).single();
    if (rError || !restaurant) return res.status(404).json({ error: "Restaurante no encontrado" });

    const { data: table, error: tError } = await supabase
      .from('tables').select('*').eq('table_id', table_id).eq('restaurant_id', restaurant_id).single();
    if (tError || !table) return res.status(404).json({ error: "Mesa no encontrada" });

    const { data: session, error: sError } = await supabase
      .from('sessions').select('*').eq('session_id', session_id).single();
    if (sError || !session) return res.status(404).json({ error: "Sesion no encontrada" });

    const { data: menuItems, error: mError } = await supabase
      .from('menu_items').select('*').eq('restaurant_id', restaurant_id).eq('available', true);
    if (mError) return res.status(500).json({ error: "Error al consultar la carta" });

    const menuFormatted = menuItems.map(item =>
      `- ${item.name} (${item.category}): ${item.price}EUR. ${item.description || ''}. Alergenos: ${item.allergens?.join(', ') || 'ninguno'}.`
    ).join('\n');

    const systemPrompt = `Eres ${restaurant.assistant_name}, el camarero virtual de ${restaurant.name} en ${restaurant.location}. Tu unico restaurante es ${restaurant.name}. Tu personalidad: ${restaurant.assistant_personality}. Carta: ${menuFormatted}. Cliente en ${table.name}. Pedido actual: ${JSON.stringify(session.orders)}. Responde siempre en español. Pregunta punto de carne. Arroces minimo 2 personas. ${restaurant.restrictions || ''}`;

    const tools = [
      { name: "update_cart", description: "Anadir platos a la comanda.", input_schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "integer" }, notes: { type: "string" } }, required: ["name", "quantity"] } } }, required: ["items"] } },
      { name: "call_waiter", description: "Llamar camarero.", input_schema: { type: "object", properties: { reason: { type: "string" } } } },
      { name: "request_bill", description: "Pedir cuenta.", input_schema: { type: "object", properties: {} } }
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system: systemPrompt, messages: [...history, { role: "user", content: message }], tools }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Error Claude API: " + errText });
    }

    const claudeResult = await response.json();
    const replyText = claudeResult.content.find(c => c.type === 'text')?.text || "";
    const toolUse = claudeResult.content.find(c => c.type === 'tool_use');
    const action = toolUse ? { name: toolUse.name, input: toolUse.input, id: toolUse.id } : null;

    await supabase.from('sessions').update({ last_interaction: new Date().toISOString() }).eq('session_id', session_id);

    return res.status(200).json({
      reply: replyText,
      action,
      history: [...history, { role: "user", content: message }, { role: "assistant", content: claudeResult.content }]
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
