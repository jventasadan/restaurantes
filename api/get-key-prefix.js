export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY || '';
  res.json({ prefix: key.substring(0, 20) + '...' });
}
