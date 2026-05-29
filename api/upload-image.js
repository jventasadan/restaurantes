import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Config error' });

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { base64, fileName, mimeType, restaurantId } = req.body;
    if (!base64 || !fileName || !restaurantId) return res.status(400).json({ error: 'Faltan parámetros' });

    const buffer = Buffer.from(base64, 'base64');
    const path = `${restaurantId}/${fileName}-${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;

    const { data, error } = await supabase.storage.from('assets').upload(path, buffer, {
      contentType: mimeType,
      upsert: true
    });
    if (error) return res.status(500).json({ error: error.message });

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
