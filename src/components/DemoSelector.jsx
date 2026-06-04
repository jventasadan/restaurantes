import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

function DemoSelector() {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  useEffect(() => {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, i) => {
      card.style.animationDelay = `${0.2 + i * 0.15}s`;
    });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1525 40%, #0a1520 100%)',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: '#e8f0fe',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* Animated background blobs */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 0, overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', width: '600px', height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,132,255,0.08) 0%, transparent 70%)',
          top: '-100px', left: '-100px',
          animation: 'blob1 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
          bottom: '10%', right: '-80px',
          animation: 'blob2 10s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', width: '300px', height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,179,237,0.05) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'blob3 12s ease-in-out infinite'
        }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Sora:wght@300;400;600;700;800&display=swap');

        @keyframes blob1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.05); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(-50%,-50%) scale(1); }
          50% { transform: translate(-50%,-50%) scale(1.2); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56,132,255,0.3); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(56,132,255,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56,132,255,0); }
        }

        .feature-card {
          opacity: 0;
          animation: fadeUp 0.6s ease forwards;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(56,132,255,0.12);
          border-radius: 20px;
          padding: 2rem;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56,132,255,0.4), transparent);
        }
        .feature-card:hover {
          transform: translateY(-6px);
          border-color: rgba(56,132,255,0.35);
          background: rgba(56,132,255,0.06);
          box-shadow: 0 20px 60px rgba(56,132,255,0.12);
        }

        .btn-primary {
          background: linear-gradient(135deg, #1a6bff, #0099e6);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.25s ease;
          letter-spacing: 0.3px;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #2575ff, #00aaff);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(26,107,255,0.35);
        }

        .btn-secondary {
          background: rgba(255,255,255,0.05);
          color: #a0b8d8;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          transition: all 0.25s ease;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(56,132,255,0.3);
          color: #c8d8f0;
          transform: translateY(-2px);
        }

        .hero-title {
          animation: fadeUp 0.7s ease 0.1s forwards;
          opacity: 0;
        }
        .hero-sub {
          animation: fadeUp 0.7s ease 0.25s forwards;
          opacity: 0;
        }
        .hero-logo {
          animation: fadeIn 0.8s ease forwards;
          opacity: 0;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(26,107,255,0.12);
          border: 1px solid rgba(26,107,255,0.25);
          color: #7eb3ff;
          padding: 0.3rem 0.9rem;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .icon-wrap {
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 30px;
          padding: 0.5rem 1.2rem;
          font-size: 0.85rem;
          color: #8baac8;
          animation: fadeIn 0.8s ease 0.6s forwards;
          opacity: 0;
        }
        .stat-pill strong { color: #c8dcf0; }

        @media (max-width: 768px) {
          .cards-grid { grid-template-columns: 1fr !important; }
          .hero-logo-img { width: 100px !important; height: 100px !important; }
          h1 { font-size: 2rem !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10,
        padding: '1.25rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '1200px', margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={logo} alt="WaiterAI" style={{
            width: '38px', height: '38px',
            borderRadius: '10px', objectFit: 'cover'
          }} />
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '1.2rem', fontWeight: 700,
            color: '#e8f0fe'
          }}>
            Waiter<span style={{ color: '#3884ff' }}>AI</span>
          </span>
        </div>
        <div className="badge">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3ddc84', display: 'inline-block' }} />
          Piloto activo
        </div>
      </header>

      {/* Hero */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem 3rem' }}>

        {/* Logo + headline centrado */}
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <div className="hero-logo" style={{ marginBottom: '2rem' }}>
            <img
              src={logo}
              alt="WaiterAI"
              className="hero-logo-img"
              style={{
                width: '140px', height: '140px',
                borderRadius: '28px',
                objectFit: 'cover',
                animation: 'logoFloat 4s ease-in-out infinite, fadeIn 0.8s ease forwards',
                boxShadow: '0 0 0 1px rgba(56,132,255,0.2), 0 20px 60px rgba(56,132,255,0.2)',
              }}
            />
          </div>

          <h1 className="hero-title" style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '3rem', fontWeight: 800,
            lineHeight: 1.15, marginBottom: '1.25rem',
            color: '#eaf0ff'
          }}>
            El camarero inteligente<br />
            <span style={{
              background: 'linear-gradient(135deg, #3884ff, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              para tu restaurante
            </span>
          </h1>

          <p className="hero-sub" style={{
            fontSize: '1.1rem', color: '#7a96b8',
            maxWidth: '560px', margin: '0 auto 2rem',
            lineHeight: 1.65
          }}>
            Asistente de IA conversacional integrado con tu carta. Toma comandas, recomienda platos y conecta cocina y barra en tiempo real.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="stat-pill">🍽️ <strong>Menú digital</strong> interactivo</div>
            <div className="stat-pill" style={{ animationDelay: '0.75s' }}>🤖 <strong>IA</strong> conversacional</div>
            <div className="stat-pill" style={{ animationDelay: '0.9s' }}>⚡ <strong>Tiempo real</strong> Supabase</div>
          </div>
        </div>

        {/* Cards */}
        <div className="cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>

          {/* Carta del cliente */}
          <div className="feature-card">
            <div className="icon-wrap" style={{ background: 'rgba(56,132,255,0.12)', color: '#3884ff' }}>
              📱
            </div>
            <h3 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '1.15rem', fontWeight: 700,
              color: '#dde8ff', marginBottom: '0.6rem'
            }}>
              Vista del Cliente
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6a8aaa', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Simula el QR de mesa. El cliente explora la carta, habla con el asistente de IA y realiza su comanda de forma natural.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button className="btn-primary" onClick={() => navigate('/mesa?r=al-punto-rivas&t=rivas-t1')}>
                Rivas — Mesa 1 (Martín)
              </button>
              <button className="btn-secondary" onClick={() => navigate('/mesa?r=al-punto-sanse&t=sanse-t1')}>
                Sanse — Mesa 1 (Sofía)
              </button>
            </div>
          </div>

          {/* Panel de Caja */}
          <div className="feature-card">
            <div className="icon-wrap" style={{ background: 'rgba(0,212,137,0.1)', color: '#00d489' }}>
              🖥️
            </div>
            <h3 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '1.15rem', fontWeight: 700,
              color: '#dde8ff', marginBottom: '0.6rem'
            }}>
              Panel de Caja
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6a8aaa', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Pantalla para cocina y barra. Recibe los pedidos al instante, gestiona estados y controla el flujo del servicio en vivo.
            </p>
            <button className="btn-primary" style={{
              background: 'linear-gradient(135deg, #00a86b, #00d489)'
            }} onClick={() => navigate('/caja')}>
              Abrir Panel de Caja
            </button>
          </div>

          {/* Administración */}
          <div className="feature-card">
            <div className="icon-wrap" style={{ background: 'rgba(255,165,0,0.1)', color: '#ffa500' }}>
              ⚙️
            </div>
            <h3 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '1.15rem', fontWeight: 700,
              color: '#dde8ff', marginBottom: '0.6rem'
            }}>
              Administración
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6a8aaa', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Gestiona la carta, sube PDFs con IA-OCR, configura mesas y colores, y descarga los QRs imprimibles para cada mesa.
            </p>
            <button className="btn-primary" style={{
              background: 'linear-gradient(135deg, #cc7700, #ffa500)'
            }} onClick={() => navigate('/admin')}>
              Panel de Control
            </button>
          </div>
        </div>

        {/* Info multi-tenant */}
        <div style={{
          background: 'rgba(56,132,255,0.04)',
          border: '1px solid rgba(56,132,255,0.12)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>🔒</span>
          <div>
            <p style={{ fontWeight: 600, color: '#7eb3ff', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
              Arquitectura Multi-tenant & RLS activa
            </p>
            <p style={{ fontSize: '0.82rem', color: '#56748a', lineHeight: 1.5 }}>
              Cada restaurante está aislado por políticas RLS en Supabase usando <code style={{ color: '#5a9fd8', background: 'rgba(56,132,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>restaurant_id</code>. Abre dos pestañas para comprobar que Rivas y Sanse no comparten datos.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', padding: '2rem',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        fontSize: '0.82rem', color: '#2e4560'
      }}>
        © 2026 WaiterAI — Asistentes virtuales de camareros para restaurantes independientes
      </footer>
    </div>
  );
}

export default DemoSelector;
