export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Insertar un usuario de prueba para verificar que la tabla existe
  const check = await fetch(`${supabaseUrl}/rest/v1/restaurant_users?limit=1`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  
  if (check.status === 200) {
    return res.status(200).json({ status: 'table exists', ok: true });
  }
  
  return res.status(200).json({ status: 'table might not exist', httpStatus: check.status });
}
