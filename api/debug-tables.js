import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verificar si existe rivas-t1
  const { data: rivasT1 } = await supabase
    .from('tables').select('table_id').eq('table_id', 'rivas-t1').maybeSingle();

  const results = [];

  if (!rivasT1) {
    // Insertar mesas con IDs cortos que usa todo el sistema
    const mesas = [
      { table_id: 'rivas-t1', name: 'Mesa 1', restaurant_id: 'al-punto-rivas', zone: 'interior', status: 'active', seasonal: false },
      { table_id: 'rivas-t2', name: 'Mesa 2', restaurant_id: 'al-punto-rivas', zone: 'interior', status: 'active', seasonal: false },
      { table_id: 'rivas-t3', name: 'Mesa 3', restaurant_id: 'al-punto-rivas', zone: 'interior', status: 'active', seasonal: false },
      { table_id: 'rivas-t4', name: 'Mesa 4', restaurant_id: 'al-punto-rivas', zone: 'terraza', status: 'active', seasonal: false },
      { table_id: 'rivas-t5', name: 'Mesa 5', restaurant_id: 'al-punto-rivas', zone: 'terraza', status: 'active', seasonal: false },
    ];
    for (const m of mesas) {
      const { error } = await supabase.from('tables').insert(m);
      results.push({ table_id: m.table_id, error: error?.message || null });
    }
  }

  // Listar todas las mesas
  const { data: allTables } = await supabase
    .from('tables').select('table_id, name, restaurant_id').eq('restaurant_id', 'al-punto-rivas').order('name');

  return res.status(200).json({ created: !rivasT1, results, tables: allTables });
}
