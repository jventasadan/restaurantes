import React, { useState } from 'react';

function AuthView() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRestaurantId = (name) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 40);
  };

  const handleRestaurantNameChange = (e) => {
    const name = e.target.value;
    setRestaurantName(name);
    if (!restaurantId || restaurantId === generateRestaurantId(restaurantName)) {
      setRestaurantId(generateRestaurantId(name));
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('Rellena todos los campos'); return; }
    if (mode === 'register' && !restaurantName.trim()) { setError('Introduce el nombre del restaurante'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password, restaurantName, restaurantId })
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Error desconocido'); return; }

      localStorage.setItem('cv_user', JSON.stringify(data.user));
      window.location.href = '/admin';
    } catch (err) {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <h1 style={{ textAlign: 'center', fontFamily: 'Playfair Display, serif', color: '#C8A96E', fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.5rem' }}>Camarero Virtual</h1>
        <p style={{ textAlign: 'center', color: '#A6A19A', marginBottom: '2rem', fontSize: '0.9rem' }}>Panel de Gestión</p>

        <div style={{ background: '#1A1A1A', border: '1px solid rgba(200,169,110,0.15)', borderRadius: '12px', padding: 'clamp(1.25rem, 4vw, 2rem)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {[['login', 'Iniciar Sesión'], ['register', 'Registrarse']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: mode === m ? '2px solid #C8A96E' : '2px solid transparent', color: mode === m ? '#C8A96E' : '#A6A19A', cursor: 'pointer', fontWeight: mode === m ? 600 : 400, fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>{label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#A6A19A', marginBottom: '0.4rem' }}>Nombre del Restaurante</label>
                  <input value={restaurantName} onChange={handleRestaurantNameChange} placeholder="Mi Restaurante" style={inputSt} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#A6A19A', marginBottom: '0.4rem' }}>ID del Restaurante <span style={{ color: '#555', fontSize: '0.75rem' }}>(se genera automáticamente)</span></label>
                  <input value={restaurantId} onChange={e => setRestaurantId(e.target.value)} placeholder="mi-restaurante" style={{ ...inputSt, color: '#888' }} />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#A6A19A', marginBottom: '0.4rem' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@mirestaurante.com" style={inputSt} onKeyPress={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#A6A19A', marginBottom: '0.4rem' }}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputSt} onKeyPress={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(192,112,112,0.1)', border: '1px solid rgba(192,112,112,0.3)', borderRadius: '8px', color: '#C07070', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>
            )}

            <button onClick={handleSubmit} disabled={loading} style={{ padding: '0.875rem', background: loading ? '#555' : '#C8A96E', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '0.25rem' }}>
              {loading ? 'Procesando...' : (mode === 'login' ? 'Entrar' : 'Crear Cuenta')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputSt = { width: '100%', padding: '0.7rem 0.875rem', background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FAF7F2', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' };

export default AuthView;
