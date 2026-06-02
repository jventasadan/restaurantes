import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { restaurant_id, items, dia } = req.body;
  if (!restaurant_id || !items?.length) return res.status(400).json({ error: 'Faltan datos' });

  const diasValidos = ['lunes','martes','miércoles','jueves','viernes'];
  const hoy = diasValidos.includes(dia) ? dia : diasValidos[new Date().getDay() - 1] || 'lunes';

  // Borrar solo los items del día seleccionado
  await supabase.from('menu_items').delete()
    .eq('restaurant_id', restaurant_id)
    .like('notes', `menu_dia_${hoy}|%`);

  // Insertar nuevos
  const errors = [];
  for (const item of items) {
    const { error } = await supabase.from('menu_items').insert({
      restaurant_id,
      category: 'Menú del Día',
      name: item.name,
      description: item.description || null,
      price: parseFloat(item.price) || 0,
      price_type: item.price_type || 'por unidad',
      allergens: item.allergens || [],
      available: true,
      notes: `menu_dia_${hoy}|${item.category || ''}`
    });
    if (error) errors.push(`${item.name}: ${error.message}`);
  }

  return res.status(200).json({
    ok: errors.length === 0,
    inserted: items.length - errors.length,
    errors
  });
}
