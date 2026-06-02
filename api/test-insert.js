import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Intentar insertar un item de prueba
  const { data: inserted, error: insErr } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: 'restaurante-ventas',
      category: 'Menú del Día',
      name: 'TEST ITEM - borrar',
      description: 'test',
      price: 0,
      price_type: 'por unidad',
      allergens: [],
      available: true,
      notes: 'menu_dia_test|Primeros'
    })
    .select();

  // 2. Verificar que llegó
  const { data: check, error: checkErr } = await supabase
    .from('menu_items')
    .select('id, name, category, notes')
    .eq('restaurant_id', 'restaurante-ventas')
    .eq('category', 'Menú del Día');

  // 3. Borrarlo
  if (inserted?.[0]?.id) {
    await supabase.from('menu_items').delete().eq('id', inserted[0].id);
  }

  return res.status(200).json({
    insert_error: insErr?.message || null,
    inserted: inserted || null,
    check_error: checkErr?.message || null,
    menu_dia_items_found: check || [],
    env_check: {
      has_url: !!supabaseUrl,
      has_key: !!supabaseKey,
      key_type: supabaseKey.includes('service_role') ? 'service_role' : supabaseKey.startsWith('eyJ') ? 'jwt_anon' : 'unknown'
    }
  });
}
