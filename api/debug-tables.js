import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Listar mesas
  const { data: tables, error: tErr } = await supabase
    .from('tables')
    .select('table_id, name, restaurant_id')
    .eq('restaurant_id', 'al-punto-rivas');

  // Si no hay mesas, crearlas
  if (!tables || tables.length === 0) {
    const mesasDefault = [
      { table_id: 'rivas-t1', name: 'Mesa 1', restaurant_id: 'al-punto-rivas', zone: 'interior', status: 'active', seasonal: false },
      { table_id: 'rivas-t2', name: 'Mesa 2', restaurant_id: 'al-punto-rivas', zone: 'interior', status: 'active', seasonal: false },
      { table_id: 'rivas-t3', name: 'Mesa 3', restaurant_id: 'al-punto-rivas', zone: 'terraza', status: 'active', seasonal: false },
      { table_id: 'rivas-t4', name: 'Mesa 4', restaurant_id: 'al-punto-rivas', zone: 'terraza', status: 'active', seasonal: false },
    ];
    const { error: insertErr } = await supabase.from('tables').insert(mesasDefault);
    return res.status(200).json({ created: true, error: insertErr?.message, tables: mesasDefault });
  }

  return res.status(200).json({ tables, count: tables.length, error: tErr?.message });
}
