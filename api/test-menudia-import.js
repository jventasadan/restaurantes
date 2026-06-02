import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  const restaurantId = req.query.r || 'restaurante-ventas';
  const log = [];

  // Simular exactamente lo que hace importarMenuDiaSeleccionados
  const testItems = [
    { name: 'TEST Primero', category: 'Primeros', price: 14.90, description: 'test', allergens: [], price_type: 'por unidad' },
    { name: 'TEST Segundo', category: 'Segundos', price: 14.90, description: 'test', allergens: [], price_type: 'por unidad' },
  ];

  const hoy = 'test';

  // Delete por categoría
  const { error: del1 } = await supabase.from('menu_items').delete()
    .eq('restaurant_id', restaurantId).eq('category', 'Menú del Día');
  log.push({ step: 'delete_by_category', error: del1?.message || null });

  // Delete por notes
  const { error: del2 } = await supabase.from('menu_items').delete()
    .eq('restaurant_id', restaurantId).like('notes', 'menu_dia_%');
  log.push({ step: 'delete_by_notes', error: del2?.message || null });

  // Insert
  for (const item of testItems) {
    const payload = {
      restaurant_id: restaurantId,
      category: 'Menú del Día',
      name: item.name,
      description: item.description || null,
      price: parseFloat(item.price) || 0,
      price_type: item.price_type || 'por unidad',
      allergens: item.allergens || [],
      available: true,
      notes: `menu_dia_${hoy}|${item.category || ''}`
    };
    const { data, error } = await supabase.from('menu_items').insert(payload).select();
    log.push({ step: 'insert', name: item.name, id: data?.[0]?.id || null, error: error?.message || null });
  }

  // Verificar qué quedó
  const { data: final } = await supabase.from('menu_items').select('id,name,category,notes')
    .eq('restaurant_id', restaurantId).eq('category', 'Menú del Día');
  log.push({ step: 'final_check', count: final?.length || 0, items: final });

  // Limpiar los TEST items
  await supabase.from('menu_items').delete()
    .eq('restaurant_id', restaurantId).like('name', 'TEST%');

  return res.status(200).json({ log });
}
