import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Bell, 
  Receipt, 
  Check, 
  ChefHat, 
  Trash2, 
  RefreshCw, 
  Map, 
  Layers,
  Sparkles,
  HelpCircle,
  Timer
} from 'lucide-react';

function CajaView() {
  const [sessions, setSessions] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar temporizador cada 10 segundos para calcular el retraso de comandas
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Cargar mesas y sesiones activas inicialmente
  useEffect(() => {
    loadData();
    
    // Suscripción Realtime a la tabla sessions
    const channel = supabase
      .channel('realtime-caja')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          loadSessions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => {
          loadTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadTables(), loadSessions()]);
    setLoading(false);
  };

  const loadTables = async () => {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('status', 'active');
    if (!error && data) {
      setTables(data);
    }
  };

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, tables(*), restaurants(*)')
      .in('status', ['active', 'cuenta_solicitada'])
      .order('session_start', { ascending: false });
    
    if (!error && data) {
      setSessions(data);
    }
  };

  // 1. Modificar estado de una comanda dentro de la sesión (pending_confirm -> confirmed -> delivered)
  const updateComandaStatus = async (sessionItem, comandaId, newStatus) => {
    const updatedOrders = sessionItem.orders.map(order => {
      if (order.id === comandaId) {
        return { ...order, status: newStatus };
      }
      return order;
    });

    const { error } = await supabase
      .from('sessions')
      .update({ orders: updatedOrders })
      .eq('session_id', sessionItem.session_id);

    if (error) {
      alert("Error al actualizar la comanda: " + error.message);
    } else {
      loadSessions();
    }
  };

  // 2. Marcar camarero como atendido (desactivar waiter_requested)
  const resolveWaiterCall = async (sessionItem) => {
    const { error } = await supabase
      .from('sessions')
      .update({ waiter_requested: false })
      .eq('session_id', sessionItem.session_id);

    if (error) {
      alert("Error al resolver llamada: " + error.message);
    } else {
      loadSessions();
    }
  };

  // 3. Cerrar mesa al cobrar (status -> closed)
  const closeMesaSession = async (sessionItem) => {
    if (!window.confirm(`¿Confirmas que has cobrado la cuenta de la ${sessionItem.tables?.name}? Se cerrará la sesión de la mesa.`)) {
      return;
    }

    const { error } = await supabase
      .from('sessions')
      .update({ status: 'closed', last_interaction: new Date().toISOString() })
      .eq('session_id', sessionItem.session_id);

    if (error) {
      alert("Error al cerrar la sesión: " + error.message);
    } else {
      loadSessions();
    }
  };

  // 4. Agrupar comandas por estados para el tablero Kanban
  const getComandasByStatus = (statusName) => {
    const list = [];
    sessions.forEach(sess => {
      if (sess.orders && Array.isArray(sess.orders)) {
        sess.orders.forEach(order => {
          if (order.status === statusName) {
            list.push({
              comanda: order,
              session: sess
            });
          }
        });
      }
    });
    // Ordenar por el más antiguo primero para sacar las comandas en orden de entrada
    return list.sort((a, b) => new Date(a.comanda.timestamp) - new Date(b.comanda.timestamp));
  };

  const newComandas = getComandasByStatus('pending_confirm');
  const inProgressComandas = getComandasByStatus('confirmed');
  const readyComandas = getComandasByStatus('delivered');

  // 5. Mapa de calor de mesas
  const getTableStatusColor = (tbl) => {
    const activeSess = sessions.find(s => s.table_id === tbl.table_id);
    if (!activeSess) return '#8E9B77'; // Verde (Libre)

    // Si tiene solicitudes pendientes (camarero, cuenta o comandas sin confirmar)
    const hasPendingComanda = activeSess.orders?.some(o => o.status === 'pending_confirm');
    const isRed = activeSess.waiter_requested || activeSess.status === 'cuenta_solicitada' || hasPendingComanda;
    
    if (isRed) return '#C07070'; // Rojo (Acción pendiente/Alerta)
    return '#D9A05B'; // Amarillo (En curso / consumiendo)
  };

  // Helper para calcular minutos de demora
  const getMinutesElapsed = (timestampString) => {
    const diffMs = currentTime - new Date(timestampString);
    return Math.floor(diffMs / 60000);
  };

  if (loading) {
    return (
      <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem', color: '#C8A96E' }}>Cargando Panel de Caja...</div>
      </div>
    );
  }

  return (
    <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ 
        padding: '1.5rem 2rem', 
        borderBottom: '1px solid rgba(200, 169, 110, 0.15)',
        background: '#1A1A1A',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ChefHat size={30} style={{ color: '#C8A96E' }} />
          <div>
            <h1 style={{ fontSize: '1.6rem', color: '#FAF7F2' }}>Panel de Caja y Cocina</h1>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Monitoreo de comandas en tiempo real</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={loadData} className="btn" style={{ padding: '0.5rem 1rem' }}>
            <RefreshCw size={16} />
            Refrescar
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ display: 'flex', flexGrow: 1, padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
          
          {/* Fila 1: Alertas y Solicitudes urgentes */}
          {sessions.some(s => s.waiter_requested || s.status === 'cuenta_solicitada') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* Avisos de Camarero */}
              <div className="surface card" style={{ borderColor: 'rgba(192, 112, 112, 0.3)', background: 'rgba(192, 112, 112, 0.05)' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#C07070', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Bell size={18} className="text-danger" />
                  Mesa solicita camarero físico
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sessions.filter(s => s.waiter_requested).map(s => (
                    <div key={s.session_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1A1A1A', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <strong>{s.tables?.name}</strong> <span className="text-muted">({s.restaurants?.name})</span>
                        <div style={{ fontSize: '0.75rem', color: '#A6A19A' }}>
                          Llamado hace {getMinutesElapsed(s.last_interaction)} minutos
                        </div>
                      </div>
                      <button 
                        onClick={() => resolveWaiterCall(s)}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#8E9B77', borderColor: '#8E9B77', color: '#0D0D0D' }}
                      >
                        Atender
                      </button>
                    </div>
                  ))}
                  {sessions.filter(s => s.waiter_requested).length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: '#A6A19A' }}>No hay llamadas activas.</p>
                  )}
                </div>
              </div>

              {/* Solicitudes de Cuenta */}
              <div className="surface card" style={{ borderColor: 'rgba(200, 169, 110, 0.3)', background: 'rgba(200, 169, 110, 0.05)' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#C8A96E', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Receipt size={18} className="text-accent" />
                  Mesas solicitando cuenta
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sessions.filter(s => s.status === 'cuenta_solicitada').map(s => {
                    const totalBill = s.orders?.reduce((acc, order) => {
                      return acc + order.items.reduce((itemAcc, item) => itemAcc + (item.price * item.quantity), 0);
                    }, 0) || 0;
                    
                    return (
                      <div key={s.session_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1A1A1A', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <strong>{s.tables?.name}</strong> <span className="text-muted">({s.restaurants?.name})</span>
                          <div style={{ fontSize: '0.85rem', color: '#C8A96E', fontWeight: 600 }}>Total: {totalBill.toFixed(2)}€</div>
                        </div>
                        <button 
                          onClick={() => closeMesaSession(s)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          Cobrar y Cerrar Mesa
                        </button>
                      </div>
                    );
                  })}
                  {sessions.filter(s => s.status === 'cuenta_solicitada').length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: '#A6A19A' }}>No hay cuentas solicitadas.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Fila 2: Mapa de Calor de Mesas */}
          <div className="surface card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Map size={18} />
              Mapa de Calor de Mesas
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
              {tables.map(tbl => {
                const activeSess = sessions.find(s => s.table_id === tbl.table_id);
                const color = getTableStatusColor(tbl);
                
                return (
                  <div 
                    key={tbl.table_id} 
                    style={{ 
                      border: `1.5px solid ${color}`,
                      background: activeSess ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      borderRadius: '8px',
                      padding: '0.75rem 1.25rem',
                      minWidth: '120px',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tbl.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#A6A19A' }}>
                      {tbl.zone === 'interior' ? 'Salón' : 'Terraza'}
                    </div>
                    
                    {/* Indicador de estado */}
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: color, 
                      margin: '0.5rem auto 0 auto'
                    }} />

                    {activeSess && (
                      <div style={{ fontSize: '0.65rem', color: '#C8A96E', marginTop: '0.25rem' }}>
                        {activeSess.restaurants?.name?.split(' - ')[1] || 'Ocupada'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8E9B77' }} />
                <span className="text-muted">Libre / Limpia</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#D9A05B' }} />
                <span className="text-muted">Consumiendo (Activa)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C07070' }} />
                <span className="text-muted">Requiere Acción (Nueva Comanda / Llamada)</span>
              </div>
            </div>
          </div>

          {/* Fila 3: Kanban de Comandas */}
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Tablero de Preparación</h2>
            
            <div className="kanban-board">
              
              {/* Columna: Nuevos */}
              <div className="kanban-col">
                <div className="kanban-col-title">
                  <span>Nuevos</span>
                  <span style={{ color: '#C8A96E' }}>{newComandas.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '550px' }}>
                  {newComandas.map(({ comanda, session: sess }) => {
                    const elapsed = getMinutesElapsed(comanda.timestamp);
                    const isOverLimit = elapsed >= 5; // Más de 5 minutos sin confirmar
                    
                    return (
                      <div 
                        key={comanda.id} 
                        className="surface card" 
                        style={{ 
                          padding: '1rem', 
                          border: isOverLimit ? '1.5px solid #C07070' : '1px solid rgba(200, 169, 110, 0.15)',
                          boxShadow: isOverLimit ? '0 0 10px rgba(192, 112, 112, 0.2)' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>{sess.tables?.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#A6A19A' }}>
                            {sess.restaurants?.name?.split(' - ')[1] || ''}
                          </span>
                        </div>

                        {/* Platos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {comanda.items.map((item, idx) => (
                            <div key={idx} style={{ fontSize: '0.9rem' }}>
                              <span><strong>{item.quantity}x</strong> {item.name}</span>
                              {item.notes && (
                                <div style={{ fontSize: '0.8rem', color: '#D9A05B', fontWeight: 'bold', marginLeft: '1rem' }}>
                                  ⚠️ {item.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Pie de comanda */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: isOverLimit ? '#C07070' : '#A6A19A',
                            fontWeight: isOverLimit ? 'bold' : 'normal',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Timer size={12} />
                            {elapsed} min
                          </span>
                          <button 
                            onClick={() => updateComandaStatus(sess, comanda.id, 'confirmed')}
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            <Check size={12} />
                            Confirmar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {newComandas.length === 0 && (
                    <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>No hay comandas nuevas.</p>
                  )}
                </div>
              </div>

              {/* Columna: En curso */}
              <div className="kanban-col">
                <div className="kanban-col-title">
                  <span>En Cocina</span>
                  <span style={{ color: '#D9A05B' }}>{inProgressComandas.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '550px' }}>
                  {inProgressComandas.map(({ comanda, session: sess }) => (
                    <div 
                      key={comanda.id} 
                      className="surface card" 
                      style={{ 
                        padding: '1rem', 
                        borderColor: 'rgba(219, 160, 91, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{sess.tables?.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#A6A19A' }}>
                          {sess.restaurants?.name?.split(' - ')[1] || ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {comanda.items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.9rem' }}>
                            <span><strong>{item.quantity}x</strong> {item.name}</span>
                            {item.notes && (
                              <div style={{ fontSize: '0.8rem', color: '#D9A05B', fontWeight: 'bold', marginLeft: '1rem' }}>
                                ⚠️ {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#A6A19A' }}>
                          Hace {getMinutesElapsed(comanda.timestamp)} min
                        </span>
                        <button 
                          onClick={() => updateComandaStatus(sess, comanda.id, 'delivered')}
                          className="btn"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderColor: '#8E9B77', color: '#8E9B77' }}
                        >
                          Listo
                        </button>
                      </div>
                    </div>
                  ))}
                  {inProgressComandas.length === 0 && (
                    <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>No hay comandas en preparación.</p>
                  )}
                </div>
              </div>

              {/* Columna: Listos */}
              <div className="kanban-col">
                <div className="kanban-col-title">
                  <span>Servidos</span>
                  <span style={{ color: '#8E9B77' }}>{readyComandas.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '550px' }}>
                  {readyComandas.map(({ comanda, session: sess }) => (
                    <div 
                      key={comanda.id} 
                      className="surface card" 
                      style={{ 
                        padding: '1rem', 
                        borderColor: 'rgba(142, 155, 119, 0.3)',
                        opacity: 0.85,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{sess.tables?.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#A6A19A' }}>
                          {sess.restaurants?.name?.split(' - ')[1] || ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {comanda.items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: '#A6A19A' }}>
                            <span>{item.quantity}x {item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {readyComandas.length === 0 && (
                    <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>No hay comandas servidas recientemente.</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CajaView;
