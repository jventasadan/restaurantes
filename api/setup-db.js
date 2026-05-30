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

  // 1. Crear restaurante "restaurante-ventas"
  const { error: r1 } = await supabase.from('restaurants').upsert({
    restaurant_id: 'restaurante-ventas',
    name: 'Restaurante Ventas',
    assistant_name: 'Carlos',
    assistant_personality: 'Amable, cercano y conocedor de la carta',
    welcome_message: '¡Bienvenidos al Restaurante Ventas! Soy Carlos, vuestro asistente esta noche.',
    location: 'Madrid',
    specialties: 'Cocina española tradicional',
    restrictions: ''
  }, { onConflict: 'restaurant_id' });
  results.push({ step: 'restaurante-ventas', error: r1?.message || null });

  // 2. Crear branding
  const { error: r2 } = await supabase.from('restaurant_branding').upsert({
    restaurant_id: 'restaurante-ventas',
    primary_color: '#C8A96E',
    secondary_color: '#0D0D0D'
  }, { onConflict: 'restaurant_id' });
  results.push({ step: 'branding-ventas', error: r2?.message || null });

  // 3. Crear tabla restaurant_users via Management API de Supabase
  const projectRef = 'uojwxuhxahkjthzgjdiy';
  const mgmtSql = `
    CREATE TABLE IF NOT EXISTS public.restaurant_users (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      restaurant_id text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text DEFAULT 'admin',
      created_at timestamptz DEFAULT now()
    );
    GRANT ALL ON public.restaurant_users TO anon, authenticated, service_role;
  `;
  
  // Intentar via REST API con service_role
  const pgResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: mgmtSql })
  }).catch(e => ({ ok: false, statusText: e.message }));
  
  results.push({ step: 'create_users_table_rpc', status: pgResponse.status || 'fetch_error' });

  // Verificar si existe ahora
  const { error: checkErr } = await supabase.from('restaurant_users').select('id').limit(1);
  const tableExists = !checkErr;
  results.push({ step: 'table_exists', exists: tableExists, error: checkErr?.message });

  // 4. Si la tabla existe, crear usuario
  if (tableExists) {
    const passwordHash = 'f9f4335718dae67309098ca95076e69f704ab3c9ce26f0e3aa2f97bc8a6fca6d';
    const { data: existUser } = await supabase.from('restaurant_users')
      .select('id').eq('email', 'j.ventas.adan@gmail.com').maybeSingle();
    
    if (!existUser) {
      const { error: r3 } = await supabase.from('restaurant_users').insert({
        restaurant_id: 'restaurante-ventas',
        email: 'j.ventas.adan@gmail.com',
        password_hash: passwordHash,
        role: 'admin'
      });
      results.push({ step: 'usuario-creado', error: r3?.message || null });
    } else {
      await supabase.from('restaurant_users')
        .update({ password_hash: passwordHash, restaurant_id: 'restaurante-ventas' })
        .eq('email', 'j.ventas.adan@gmail.com');
      results.push({ step: 'usuario-actualizado' });
    }
  }

  // 5. Añadir bebidas con INSERT simple (ignorar duplicados)
  const bebidas = ['Coca-Cola','Agua Mineral','Cerveza','Vino de la casa','Fanta','Zumo de naranja'];
  const preciosYDesc = {
    'Coca-Cola': [2.50, 'Refresco de cola'],
    'Agua Mineral': [1.80, 'Agua mineral natural 0.5L'],
    'Cerveza': [2.80, 'Caña de cerveza nacional'],
    'Vino de la casa': [3.50, 'Copa de vino tinto/blanco/rosado'],
    'Fanta': [2.50, 'Refresco de naranja/limón'],
    'Zumo de naranja': [3.20, 'Zumo natural exprimido'],
  };

  for (const name of bebidas) {
    const [price, description] = preciosYDesc[name];
    // Verificar si ya existe
    const { data: existing } = await supabase.from('menu_items')
      .select('id').eq('restaurant_id', 'al-punto-rivas').eq('name', name).maybeSingle();
    
    if (!existing) {
      const { error } = await supabase.from('menu_items').insert({
        restaurant_id: 'al-punto-rivas',
        category: 'Bebidas',
        name,
        description,
        price,
        price_type: 'por unidad',
        allergens: [],
        available: true,
        source: 'manual'
      });
      results.push({ step: `bebida_${name}`, error: error?.message || null });
    } else {
      results.push({ step: `bebida_${name}`, status: 'ya_existe' });
    }
  }

  return res.status(200).json({ ok: true, results });
}

// Este código añade al final del handler existente - NO, mejor crear una función nueva
