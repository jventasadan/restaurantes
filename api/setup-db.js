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

  // 3. Verificar/crear tabla restaurant_users
  const { error: checkErr } = await supabase.from('restaurant_users').select('id').limit(1);
  results.push({ step: 'check_users_table', exists: !checkErr, error: checkErr?.message });

  // 4. Crear usuario (hash SHA-256 de "Jonathan27")
  const passwordHash = 'f9f4335718dae67309098ca95076e69f704ab3c9ce26f0e3aa2f97bc8a6fca6d';
  
  if (!checkErr) {
    // La tabla existe, insertar usuario
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
      // Actualizar hash si ya existe
      const { error: r3 } = await supabase.from('restaurant_users')
        .update({ password_hash: passwordHash, restaurant_id: 'restaurante-ventas' })
        .eq('email', 'j.ventas.adan@gmail.com');
      results.push({ step: 'usuario-actualizado', error: r3?.message || null });
    }
  }

  // 5. Añadir bebidas a al-punto-rivas
  const bebidas = [
    { name: 'Coca-Cola', description: 'Refresco de cola', price: 2.50 },
    { name: 'Agua Mineral', description: 'Agua mineral natural 0.5L', price: 1.80 },
    { name: 'Cerveza', description: 'Caña de cerveza nacional', price: 2.80 },
    { name: 'Vino de la casa', description: 'Copa de vino tinto/blanco/rosado', price: 3.50 },
    { name: 'Fanta', description: 'Refresco de naranja/limón', price: 2.50 },
    { name: 'Zumo de naranja', description: 'Zumo natural exprimido', price: 3.20 },
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
    }, { onConflict: 'restaurant_id,name' });
    results.push({ step: `bebida_${b.name}`, error: error?.message || null });
  }

  return res.status(200).json({ ok: true, results });
}
