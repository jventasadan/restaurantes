import { createClient } from '@supabase/supabase-js';

// Redimensionar imagen usando Canvas API (disponible en Node 18+)
// Si sharp no está disponible, subimos sin redimensionar pero hacemos resize en el frontend
async function resizeImageBuffer(base64, mimeType, maxW, maxH) {
  try {
    // Intentar con sharp si está disponible
    const sharp = await import('sharp').catch(() => null);
    if (sharp) {
      const buf = Buffer.from(base64, 'base64');
      const resized = await sharp.default(buf)
        .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      return { buffer: resized, mime: 'image/jpeg' };
    }
  } catch(e) {}
  // Fallback: devolver original
  return { buffer: Buffer.from(base64, 'base64'), mime: mimeType };
}

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

    // Definir tamaños máximos según tipo
    const maxW = fileName === 'logo' ? 400 : 1200;
    const maxH = fileName === 'logo' ? 400 : 800;

    const { buffer, mime } = await resizeImageBuffer(base64, mimeType, maxW, maxH);
    const ext = mime.split('/')[1] || 'jpg';
    const path = `${restaurantId}/${fileName}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('assets').upload(path, buffer, {
      contentType: mime,
      upsert: true
    });
    if (error) return res.status(500).json({ error: error.message });

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
