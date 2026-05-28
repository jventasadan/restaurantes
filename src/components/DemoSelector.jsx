import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, MonitorPlay, Settings, ShieldAlert, BadgeInfo } from 'lucide-react';

function DemoSelector() {
  const navigate = useNavigate();

  return (
    <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ 
        padding: '2rem 1.5rem', 
        borderBottom: '1px solid rgba(200, 169, 110, 0.15)',
        background: '#0D0D0D'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '1.8rem', 
              color: '#C8A96E',
              fontWeight: 700 
            }}>
              Camarero Virtual
            </span>
            <span style={{ 
              background: 'rgba(200, 169, 110, 0.1)', 
              color: '#C8A96E', 
              border: '1px solid rgba(200, 169, 110, 0.2)',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              PILOTO
            </span>
          </div>
          <span style={{ fontSize: '0.9rem', color: '#A6A19A' }}>Al Punto Arroces y Carnes</span>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '900px' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem', 
            lineHeight: 1.2,
            color: '#FAF7F2' 
          }}>
            La Inteligencia Artificial que <span style={{ color: '#C8A96E', fontStyle: 'italic' }}>revoluciona</span> tu mesa
          </h1>
          <p className="text-muted" style={{ 
            fontSize: '1.1rem', 
            maxWidth: '650px', 
            margin: '0 auto 3rem auto',
            color: '#A6A19A'
          }}>
            Toma de comandas inteligente mediante asistente conversacional integrado con tu carta en Supabase y panel de cocina en tiempo real.
          </p>

          {/* Grilla de Opciones */}
          <div className="grid grid-cols-3" style={{ gap: '2rem', marginBottom: '3rem' }}>
            {/* Opción 1: Cliente QR */}
            <div className="surface card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '1rem',
              textAlign: 'center' 
            }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: 'rgba(200, 169, 110, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#C8A96E'
              }}>
                <QrCode size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#FAF7F2' }}>Simular QR de Cliente</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', flexGrow: 1 }}>
                Escanea la mesa simulada. Habla con el asistente de IA para tomar tu comanda y ver la carta interactiva.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <button 
                  onClick={() => navigate('/mesa?r=al-punto-rivas&t=rivas-t1')}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Rivas — Mesa 1 (Martín)
                </button>
                <button 
                  onClick={() => navigate('/mesa?r=al-punto-sanse&t=sanse-t1')}
                  className="btn"
                  style={{ width: '100%', border: '1px solid rgba(200, 169, 110, 0.3)' }}
                >
                  Sanse — Mesa 1 (Sofía)
                </button>
              </div>
            </div>

            {/* Opción 2: Panel de Caja */}
            <div className="surface card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '1rem',
              textAlign: 'center' 
            }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: 'rgba(200, 169, 110, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#C8A96E'
              }}>
                <MonitorPlay size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#FAF7F2' }}>Panel de Caja</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', flexGrow: 1 }}>
                Pantalla para cocina y barra. Recibe alertas y pedidos en tiempo real con actualizaciones por Supabase Realtime.
              </p>
              <button 
                onClick={() => navigate('/caja')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Abrir Panel de Caja
              </button>
            </div>

            {/* Opción 3: Panel de Administración */}
            <div className="surface card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '1rem',
              textAlign: 'center' 
            }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: 'rgba(200, 169, 110, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#C8A96E'
              }}>
                <Settings size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#FAF7F2' }}>Administración</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', flexGrow: 1 }}>
                Gestiona la carta, sube PDFs con importación por IA OCR, configura mesas, colores y descarga los QRs imprimibles.
              </p>
              <button 
                onClick={() => navigate('/admin')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Panel de Control
              </button>
            </div>
          </div>

          {/* Información RLS y Multi-tenant */}
          <div style={{ 
            background: 'rgba(219, 160, 91, 0.05)', 
            border: '1px solid rgba(219, 160, 91, 0.15)', 
            borderRadius: '12px',
            padding: '1.25rem',
            maxWidth: '650px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            textAlign: 'left'
          }}>
            <ShieldAlert style={{ color: '#D9A05B', flexShrink: 0, marginTop: '0.2rem' }} size={20} />
            <div>
              <h4 style={{ color: '#D9A05B', fontSize: '0.95rem', marginBottom: '0.25rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                Arquitectura Multi-tenant & RLS Habilitada
              </h4>
              <p className="text-muted" style={{ fontSize: '0.85rem', color: '#A6A19A', lineHeight: 1.4 }}>
                Cada restaurante está aislado mediante políticas RLS en Supabase usando <code>restaurant_id</code>. Para testear de forma cruzada, abre dos pestañas y comprueba que Rivas no tiene acceso a los datos de Sanse.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ 
        padding: '1.5rem', 
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#5C564E'
      }}>
        © 2026 Camarero Virtual. Desarrollado para restaurantes independientes de ticket medio-alto.
      </footer>
    </div>
  );
}

export default DemoSelector;
