import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { action, email, password, restaurantName, restaurantId } = req.body;
  if (!action || !email || !password) return res.status(400).json({ error: 'Faltan parámetros' });

  const passwordHash = createHash('sha256').update(password).digest('hex');

  if (action === 'login') {
    const { data: user, error } = await supabase
      .from('restaurant_users')
      .select('id, email, restaurant_id, role')
      .eq('email', email.toLowerCase().trim())
      .eq('password_hash', passwordHash)
      .maybeSingle();

    if (error) return res.status(500).json({ error: 'Error BD: ' + error.message });
    if (!user) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    // Obtener datos del restaurante
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, restaurant_id')
      .eq('restaurant_id', user.restaurant_id)
      .single();

    return res.status(200).json({
      user: { ...user, restaurant_name: restaurant?.name }
    });
  }

  if (action === 'register') {
    if (!restaurantName || !restaurantId) return res.status(400).json({ error: 'Faltan datos del restaurante' });

    // Verificar que email no existe
    const { data: existing } = await supabase
      .from('restaurant_users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'Este email ya está registrado' });

    // Crear restaurante si no existe
    const cleanId = restaurantId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error: rErr } = await supabase.from('restaurants').upsert({
      restaurant_id: cleanId,
      name: restaurantName,
      assistant_name: 'Carlos',
      assistant_personality: 'Amable y profesional',
      welcome_message: `¡Bienvenidos a ${restaurantName}!`,
      location: '',
      specialties: '',
      restrictions: ''
    }, { onConflict: 'restaurant_id' });
    if (rErr) return res.status(500).json({ error: 'Error creando restaurante: ' + rErr.message });

    // Crear branding
    await supabase.from('restaurant_branding').upsert({
      restaurant_id: cleanId, primary_color: '#C8A96E', secondary_color: '#0D0D0D'
    }, { onConflict: 'restaurant_id' });

    // Crear usuario
    const { data: newUser, error: uErr } = await supabase
      .from('restaurant_users')
      .insert({ restaurant_id: cleanId, email: email.toLowerCase().trim(), password_hash: passwordHash, role: 'admin' })
      .select('id, email, restaurant_id, role')
      .single();
    if (uErr) return res.status(500).json({ error: 'Error creando usuario: ' + uErr.message });

    return res.status(201).json({ user: { ...newUser, restaurant_name: restaurantName } });
  }

  return res.status(400).json({ error: 'Acción no válida' });
}
