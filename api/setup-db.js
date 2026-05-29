import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-setup-secret'];
  if (secret !== 'camarero2026setup') return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = [];

  // 1. Crear tabla restaurant_users
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `CREATE TABLE IF NOT EXISTS public.restaurant_users (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      restaurant_id text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text DEFAULT 'admin',
      created_at timestamptz DEFAULT now()
    );
    GRANT ALL ON public.restaurant_users TO anon, authenticated, service_role;`
  }).catch(() => ({ error: 'rpc not available' }));
  
  // Si rpc no funciona, intentar insert directo para verificar si existe
  const { error: checkErr } = await supabase.from('restaurant_users').select('id').limit(1);
  results.push({ step: 'restaurant_users', exists: !checkErr, error: checkErr?.message });

  // 2. Añadir bebidas
  const bebidas = [
    { name: 'Coca-Cola', description: 'Refresco de cola', price: 2.50 },
    { name: 'Agua Mineral', description: 'Agua mineral natural 0.5L', price: 1.80 },
    { name: 'Cerveza', description: 'Caña de cerveza nacional', price: 2.80 },
    { name: 'Vino de la casa', description: 'Copa de vino tinto/blanco/rosado', price: 3.50 },
    { name: 'Zumo de naranja', description: 'Zumo natural de naranja', price: 3.20 },
    { name: 'Fanta', description: 'Refresco de naranja/limón', price: 2.50 },
  ];

  for (const b of bebidas) {
    const { error } = await supabase.from('menu_items').upsert({
      restaurant_id: 'al-punto-rivas',
      category: 'Bebidas',
      name: b.name,
      description: b.description,
      price: b.price,
      price_type: 'por unidad',
      allergens: [],
      available: true,
      source: 'manual'
    }, { onConflict: 'restaurant_id,name' }).catch(() => ({ error: 'upsert failed' }));
    results.push({ step: `bebida_${b.name}`, error: error?.message || null });
  }

  return res.status(200).json({ results });
}
