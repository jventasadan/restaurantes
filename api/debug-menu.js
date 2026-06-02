import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const restaurantId = req.query.r || 'restaurante-ventas';

  // Ver todos los items de este restaurante
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name, category, available, notes')
    .eq('restaurant_id', restaurantId)
    .order('category');

  // Agrupar por categoría
  const byCategory = {};
  (items || []).forEach(i => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push({ id: i.id, name: i.name, available: i.available, notes: i.notes });
  });

  return res.status(200).json({
    restaurantId,
    total: items?.length || 0,
    error: error?.message || null,
    byCategory
  });
}
