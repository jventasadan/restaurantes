import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

// Utilidad simple para hash (en producción usar bcrypt en backend)
async function simpleHash(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function AuthView({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const hash = await simpleHash(password);
      const { data, error: err } = await supabase
        .from('restaurant_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('password_hash', hash)
        .single();
      if (err || !data) { setError('Email o contraseña incorrectos.'); return; }
      localStorage.setItem('cv_user', JSON.stringify(data));
      onLogin(data);
    } catch(e) { setError('Error de conexión.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (!restaurantId.trim() || !restaurantName.trim()) { setError('Rellena todos los campos.'); setLoading(false); return; }
    try {
      const hash = await simpleHash(password);
      // Crear restaurante si no existe
      const { data: existing } = await supabase.from('restaurants').select('restaurant_id').eq('restaurant_id', restaurantId.trim()).maybeSingle();
      if (!existing) {
        await supabase.from('restaurants').insert({
          restaurant_id: restaurantId.trim(),
          name: restaurantName.trim(),
          assistant_name: 'Carlos',
          assistant_personality: 'Amable y profesional',
          welcome_message: `¡Bienvenidos a ${restaurantName.trim()}! Soy vuestro asistente virtual.`,
          location: '',
          specialties: '',
          restrictions: ''
        });
        await supabase.from('restaurant_branding').insert({ restaurant_id: restaurantId.trim(), primary_color: '#C8A96E', secondary_color: '#0D0D0D' });
      }
      // Crear usuario
      const { data, error: err } = await supabase.from('restaurant_users').insert({
        restaurant_id: restaurantId.trim(),
        email: email.toLowerCase().trim(),
        password_hash: hash,
        role: 'admin'
      }).select().single();
      if (err) { setError('Este email ya está registrado o error al crear la cuenta.'); return; }
      localStorage.setItem('cv_user', JSON.stringify(data));
      onLogin(data);
    } catch(e) { setError('Error de conexión: ' + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#C8A96E', fontSize: '2rem', marginBottom: '0.25rem' }}>Camarero Virtual</h1>
          <p style={{ color: '#A6A19A', fontSize: '0.9rem' }}>Panel de Gestión</p>
        </div>

        {/* Tarjeta */}
        <div style={{ background: '#1A1A1A', border: '1px solid rgba(200,169,110,0.2)', borderRadius: '12px', padding: '2rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                  color: mode === m ? '#C8A96E' : '#A6A19A',
                  borderBottom: mode === m ? '2px solid #C8A96E' : '2px solid transparent',
                  transition: 'all 0.2s' }}>
                {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            {mode === 'register' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#A6A19A', marginBottom: '0.4rem' }}>ID del Restaurante</label>
                  <input value={restaurantId} onChange={e => setRestaurantId(e.target.value)} placeholder="ej: mi-restaurante-madrid"
                    required style={inputStyle} />
                  <p style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.25rem' }}>Sin espacios ni caracteres especiales</p>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#A6A19A', marginBottom: '0.4rem' }}>Nombre del Restaurante</label>
                  <input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="ej: La Tasca de Madrid"
                    required style={inputStyle} />
                </div>
              </>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#A6A19A', marginBottom: '0.4rem' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@mirestaurante.com"
                required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#A6A19A', marginBottom: '0.4rem' }}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                required minLength={6} style={inputStyle} />
            </div>
            {error && <div style={{ background: 'rgba(192,112,112,0.1)', border: '1px solid rgba(192,112,112,0.3)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', color: '#C07070', marginBottom: '1rem' }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '0.875rem', background: loading ? '#555' : '#C8A96E', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.75rem', background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px', color: '#FAF7F2', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif'
};

export default AuthView;
