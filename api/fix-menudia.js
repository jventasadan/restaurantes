import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const restaurantId = req.query.r || 'restaurante-ventas';

  // Borrar items huérfanos con notes=menu_dia_* (cualquier categoría)
  const { data: deleted1, error: err1 } = await supabase
    .from('menu_items')
    .delete()
    .eq('restaurant_id', restaurantId)
    .like('notes', 'menu_dia_%')
    .select('id, name, category');

  // Borrar items con category='Primeros' o 'Segundos' que sean del menú del día
  // (los que no tienen notes correcto pero vinieron del analyzer)
  const { data: deleted2, error: err2 } = await supabase
    .from('menu_items')
    .delete()
    .eq('restaurant_id', restaurantId)
    .in('category', ['Primeros', 'Segundos', 'Postre o café', 'Postre', 'Bebida incluida'])
    .select('id, name, category');

  return res.status(200).json({
    deleted_by_notes: deleted1 || [],
    deleted_by_category: deleted2 || [],
    errors: [err1?.message, err2?.message].filter(Boolean)
  });
}
