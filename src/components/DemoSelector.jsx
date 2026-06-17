import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

function DemoSelector() {
  const navigate = useNavigate();

  useEffect(() => {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, i) => {
      card.style.animationDelay = `${0.2 + i * 0.15}s`;
    });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0804',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: '#e8dcc8',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* Blobs cálidos */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,146,58,0.1) 0%, transparent 70%)', top: '-100px', left: '-100px', filter: 'blur(60px)', animation: 'blob1 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,120,40,0.07) 0%, transparent 70%)', bottom: '10%', right: '-80px', filter: 'blur(60px)', animation: 'blob2 10s ease-in-out infinite' }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes blob1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,30px)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,-40px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        .feature-card {
          opacity: 0;
          animation: fadeUp 0.6s ease forwards;
          background: linear-gradient(145deg, rgba(40,28,12,0.9), rgba(25,18,8,0.95));
          border: 1px solid rgba(200,146,58,0.18);
          border-radius: 20px;
          padding: 1.8rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,146,58,0.4), transparent);
        }
        .feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(200,146,58,0.35);
          box-shadow: 0 20px 60px rgba(200,146,58,0.1);
        }

        .btn-primary {
          background: linear-gradient(135deg, #c8923a, #e8a020);
          color: #1a0f00;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: all 0.25s;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(200,146,58,0.35);
        }
        .btn-secondary {
          background: rgba(200,146,58,0.06);
          color: #a08060;
          border: 1px solid rgba(200,146,58,0.15);
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          transition: all 0.25s;
        }
        .btn-secondary:hover {
          background: rgba(200,146,58,0.1);
          border-color: rgba(200,146,58,0.3);
          color: #c8a060;
          transform: translateY(-2px);
        }
        .btn-green {
          background: linear-gradient(135deg, #2a7a4a, #3aaa6a);
          color: #fff;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: all 0.25s;
        }
        .btn-green:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(40,150,80,0.3); }

        @media(max-width:768px) {
          .cards-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, padding: '1.25rem 2rem', borderBottom: '1px solid rgba(200,146,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={logo} alt="WaiterAI" style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover' }} />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#f0e8d8' }}>
            Waiter<span style={{ color: '#c8923a' }}>AI</span>
          </span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(200,146,58,0.1)', border: '1px solid rgba(200,146,58,0.25)', color: '#c8923a', padding: '0.3rem 0.9rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3ddc84', display: 'inline-block' }} />
          Piloto activo
        </div>
      </header>

      {/* Hero */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '3.5rem 2rem 3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <img src={logo} alt="WaiterAI" style={{ width: '120px', height: '120px', borderRadius: '24px', objectFit: 'cover', animation: 'float 4s ease-in-out infinite', boxShadow: '0 0 0 1px rgba(200,146,58,0.2), 0 20px 60px rgba(200,146,58,0.2)', marginBottom: '2rem' }} />
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem', color: '#f0e8d8' }}>
            El camarero inteligente<br />
            <span style={{ background: 'linear-gradient(120deg,#c8923a,#e8c070)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              para tu restaurante
            </span>
          </h1>
          <p style={{ fontSize: '1rem', color: '#8a7a62', maxWidth: '500px', margin: '0 auto', lineHeight: 1.65 }}>
            Asistente de IA conversacional integrado con tu carta. El cliente pide solo, tus camareros sirven.
          </p>
        </div>

        {/* Cards */}
        <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>

          {/* Cliente */}
          <div className="feature-card">
            <div style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>📱</div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#f0e8d8', marginBottom: '0.6rem' }}>Vista del Cliente</h3>
            <p style={{ fontSize: '0.85rem', color: '#6a5a42', lineHeight: 1.6, marginBottom: '1.5rem' }}>El cliente explora la carta, habla con el asistente IA y realiza su comanda de forma natural.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button className="btn-primary" onClick={() => navigate('/mesa?r=al-punto-rivas&t=rivas-t1')}>Rivas — Mesa 1 (Martín)</button>
              <button className="btn-secondary" onClick={() => navigate('/mesa?r=al-punto-sanse&t=sanse-t1')}>Sanse — Mesa 1 (Sofía)</button>
            </div>
          </div>

          {/* Caja */}
          <div className="feature-card">
            <div style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>🖥️</div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#f0e8d8', marginBottom: '0.6rem' }}>Panel de Caja</h3>
            <p style={{ fontSize: '0.85rem', color: '#6a5a42', lineHeight: 1.6, marginBottom: '1.5rem' }}>Recibe los pedidos al instante, gestiona estados y controla el flujo del servicio en vivo.</p>
            <button className="btn-green" onClick={() => navigate('/caja')}>Abrir Panel de Caja</button>
          </div>

          {/* Admin */}
          <div className="feature-card">
            <div style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>⚙️</div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#f0e8d8', marginBottom: '0.6rem' }}>Administración</h3>
            <p style={{ fontSize: '0.85rem', color: '#6a5a42', lineHeight: 1.6, marginBottom: '1.5rem' }}>Gestiona la carta, sube PDFs con IA-OCR, configura mesas y descarga los QRs imprimibles.</p>
            <button className="btn-primary" onClick={() => navigate('/admin')}>Panel de Control</button>
          </div>

        </div>

        {/* Info */}
        <div style={{ background: 'rgba(200,146,58,0.05)', border: '1px solid rgba(200,146,58,0.12)', borderRadius: '14px', padding: '1.25rem 1.5rem', maxWidth: '680px', margin: '0 auto', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.1rem', marginTop: '2px' }}>🔒</span>
          <div>
            <p style={{ fontWeight: 600, color: '#c8923a', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Arquitectura Multi-tenant & RLS activa</p>
            <p style={{ fontSize: '0.8rem', color: '#5a4a32', lineHeight: 1.5 }}>
              Cada restaurante está aislado por políticas RLS en Supabase usando <code style={{ color: '#c8923a', background: 'rgba(200,146,58,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>restaurant_id</code>. Abre dos pestañas para comprobar que Rivas y Sanse no comparten datos.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(200,146,58,0.06)', fontSize: '0.8rem', color: '#3a2a1a' }}>
        © 2026 WaiterAI — Asistentes virtuales de camareros
      </footer>
    </div>
  );
}

export default DemoSelector;
