import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, Receipt, Check, ChefHat, Trash2, RefreshCw, Map, Timer, LogOut, X } from 'lucide-react';

function CajaView() {
  const user = JSON.parse(localStorage.getItem('cv_user') || 'null');
  const [sessions, setSessions] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('realtime-caja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, loadSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, loadTables)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const loadData = async () => { setLoading(true); await Promise.all([loadTables(), loadSessions()]); setLoading(false); };
  
  const loadTables = async () => {
    const q = user ? supabase.from('tables').select('*').eq('restaurant_id', user.restaurant_id).eq('status', 'active') : supabase.from('tables').select('*').eq('status', 'active');
    const { data } = await q;
    if (data) setTables(data);
  };

  const loadSessions = async () => {
    const q = user ? supabase.from('sessions').select('*, tables(*), restaurants(*)').eq('restaurant_id', user.restaurant_id).in('status', ['active', 'cuenta_solicitada', 'cuenta_enviada']) : supabase.from('sessions').select('*, tables(*), restaurants(*)').in('status', ['active', 'cuenta_solicitada', 'cuenta_enviada']);
    const { data } = await q.order('session_start', { ascending: false });
    if (data) setSessions(data);
  };

  const updateComandaStatus = async (sess, comandaId, newStatus) => {
    const updatedOrders = sess.orders.map(o => o.id === comandaId ? { ...o, status: newStatus } : o);
    await supabase.from('sessions').update({ orders: updatedOrders }).eq('session_id', sess.session_id);
    loadSessions();
  };

  const resolveWaiterCall = async (sess) => {
    await supabase.from('sessions').update({ waiter_requested: false }).eq('session_id', sess.session_id);
    loadSessions();
  };

  // Cuenta enviada (se la has llevado a la mesa)
  const markCuentaEnviada = async (sess) => {
    await supabase.from('sessions').update({ status: 'cuenta_enviada' }).eq('session_id', sess.session_id);
    loadSessions();
  };

  // Cuenta pagada (cierra la sesión)
  const markCuentaPagada = async (sess) => {
    await supabase.from('sessions').update({ status: 'closed', last_interaction: new Date().toISOString() }).eq('session_id', sess.session_id);
    loadSessions();
  };

  const getComandasByStatus = (statusName) => {
    const list = [];
    sessions.forEach(sess => {
      (sess.orders || []).forEach(order => {
        if (order.status === statusName) list.push({ comanda: order, session: sess });
      });
    });
    return list.sort((a, b) => new Date(a.comanda.timestamp) - new Date(b.comanda.timestamp));
  };

  const getTableColor = (tbl) => {
    const s = sessions.find(x => x.table_id === tbl.table_id);
    if (!s) return '#8E9B77';
    if (s.waiter_requested || s.status === 'cuenta_solicitada' || s.orders?.some(o => o.status === 'pending_confirm')) return '#C07070';
    if (s.status === 'cuenta_enviada') return '#D9A05B';
    return '#D9A05B';
  };

  const getMinutes = (ts) => Math.floor((currentTime - new Date(ts)) / 60000);

  const newComandas = getComandasByStatus('pending_confirm');
  const inProgress = getComandasByStatus('confirmed');
  const served = getComandasByStatus('delivered');
  const cuentasSolicitadas = sessions.filter(s => s.status === 'cuenta_solicitada' || s.status === 'cuenta_enviada');

  const logout = () => { localStorage.removeItem('cv_user'); window.location.href = '/auth'; };

  if (loading) return <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', color:'#C8A96E', fontFamily:'Inter,sans-serif' }}>Cargando Panel...</div>;

  return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', fontFamily:'Inter,sans-serif', color:'#FAF7F2' }}>
      {/* Header */}
      <header style={{ background:'#1A1A1A', borderBottom:'1px solid rgba(200,169,110,0.15)', padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <ChefHat size={26} style={{ color:'#C8A96E' }}/>
          <div>
            <h1 style={{ margin:0, fontSize:'1.3rem', color:'#FAF7F2' }}>Panel de Caja y Cocina</h1>
            <p style={{ margin:0, fontSize:'0.78rem', color:'#A6A19A' }}>Tiempo real {user ? `— ${user.restaurant_id}` : ''}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          <button onClick={loadData} style={{ padding:'0.5rem 0.875rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#FAF7F2', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.85rem' }}><RefreshCw size={14}/>Refrescar</button>
          <a href="/admin" style={{ padding:'0.5rem 0.875rem', background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', textDecoration:'none', fontSize:'0.85rem' }}>Admin</a>
          {user && <button onClick={logout} style={{ padding:'0.5rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#A6A19A', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.85rem' }}><LogOut size={14}/> Salir</button>}
        </div>
      </header>

      <div style={{ padding:'1.25rem', maxWidth:'1400px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

        {/* Alertas urgentes */}
        {sessions.some(s => s.waiter_requested || s.status === 'cuenta_solicitada' || s.status === 'cuenta_enviada') && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.25rem' }}>
            
            {/* Camarero solicitado */}
            {sessions.some(s => s.waiter_requested) && (
              <div style={{ background:'rgba(192,112,112,0.06)', border:'1px solid rgba(192,112,112,0.25)', borderRadius:'10px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem', color:'#C07070', display:'flex', alignItems:'center', gap:'0.5rem', margin:'0 0 0.875rem' }}><Bell size={16}/> Solicita camarero</h3>
                {sessions.filter(s => s.waiter_requested).map(s => (
                  <div key={s.session_id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#1A1A1A', padding:'0.625rem 0.875rem', borderRadius:'6px', marginBottom:'0.5rem' }}>
                    <div>
                      <strong style={{ fontSize:'0.9rem' }}>{s.tables?.name}</strong>
                      <div style={{ fontSize:'0.72rem', color:'#A6A19A' }}>Hace {getMinutes(s.last_interaction)} min</div>
                    </div>
                    <button onClick={() => resolveWaiterCall(s)} style={{ padding:'0.35rem 0.75rem', background:'#8E9B77', border:'none', borderRadius:'5px', color:'#0D0D0D', cursor:'pointer', fontWeight:600, fontSize:'0.78rem' }}>Atender</button>
                  </div>
                ))}
              </div>
            )}

            {/* Cuentas */}
            {cuentasSolicitadas.length > 0 && (
              <div style={{ background:'rgba(200,169,110,0.06)', border:'1px solid rgba(200,169,110,0.25)', borderRadius:'10px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem', color:'#C8A96E', display:'flex', alignItems:'center', gap:'0.5rem', margin:'0 0 0.875rem' }}><Receipt size={16}/> Cuentas</h3>
                {cuentasSolicitadas.map(s => {
                  const total = s.orders?.reduce((a, o) => a + o.items.reduce((b, i) => b + (i.price * i.quantity), 0), 0) || 0;
                  const esCuentaEnviada = s.status === 'cuenta_enviada';
                  return (
                    <div key={s.session_id} style={{ background:'#1A1A1A', padding:'0.75rem 0.875rem', borderRadius:'6px', marginBottom:'0.5rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                        <div>
                          <strong style={{ fontSize:'0.9rem' }}>{s.tables?.name}</strong>
                          <div style={{ fontSize:'0.78rem', color:'#C8A96E', fontWeight:600 }}>{total.toFixed(2)}€</div>
                        </div>
                        <span style={{ fontSize:'0.72rem', padding:'0.2rem 0.5rem', borderRadius:'4px', background: esCuentaEnviada ? 'rgba(142,155,119,0.2)' : 'rgba(200,169,110,0.2)', color: esCuentaEnviada ? '#8E9B77' : '#C8A96E' }}>
                          {esCuentaEnviada ? 'Cuenta en mesa' : 'Solicitada'}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        {!esCuentaEnviada && (
                          <button onClick={() => markCuentaEnviada(s)} style={{ flex:1, padding:'0.4rem', background:'rgba(200,169,110,0.15)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'5px', color:'#C8A96E', cursor:'pointer', fontWeight:600, fontSize:'0.78rem' }}>
                            📄 Cuenta enviada
                          </button>
                        )}
                        <button onClick={() => markCuentaPagada(s)} style={{ flex:1, padding:'0.4rem', background:'#8E9B77', border:'none', borderRadius:'5px', color:'#0D0D0D', cursor:'pointer', fontWeight:700, fontSize:'0.78rem' }}>
                          ✅ Cuenta pagada
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mapa de mesas dividido por zona */}
        <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'1.25rem' }}>
          <h3 style={{ fontSize:'0.95rem', margin:'0 0 1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}><Map size={16}/> Mapa de Mesas</h3>
          {['interior', 'terraza', 'privado'].map(zona => {
            const mesasZona = tables.filter(t => (t.zone === zona) || (zona === 'interior' && (!t.zone || t.zone === 'salon')));
            if (mesasZona.length === 0) return null;
            const zonaLabel = zona === 'interior' ? '🏠 Salón' : zona === 'terraza' ? '☀️ Terraza' : '🚪 Privado';
            const zonaColor = zona === 'terraza' ? '#D9A05B' : zona === 'privado' ? '#A6A19A' : '#C8A96E';
            return (
              <div key={zona} style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize:'0.8rem', color: zonaColor, fontWeight:600, marginBottom:'0.6rem', borderBottom:`1px solid rgba(255,255,255,0.06)`, paddingBottom:'0.3rem' }}>{zonaLabel}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem' }}>
                  {mesasZona.map(tbl => {
                    const color = getTableColor(tbl);
                    const s = sessions.find(x => x.table_id === tbl.table_id);
                    return (
                      <div key={tbl.table_id} style={{ border:`1.5px solid ${color}`, borderRadius:'8px', padding:'0.6rem 1rem', minWidth:'90px', textAlign:'center' }}>
                        <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{tbl.name}</div>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, margin:'0.35rem auto 0' }}/>
                        {s && <div style={{ fontSize:'0.62rem', color:'#C8A96E', marginTop:'0.2rem' }}>{s.status === 'cuenta_solicitada' ? 'Pide cuenta' : s.status === 'cuenta_enviada' ? 'Cuenta en mesa' : 'Activa'}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display:'flex', gap:'1.25rem', marginTop:'1rem', fontSize:'0.75rem', flexWrap:'wrap' }}>
            {[['#8E9B77','Libre'],['#D9A05B','Activa'],['#C07070','Acción pendiente']].map(([c,l]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}><div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c }}/><span style={{ color:'#A6A19A' }}>{l}</span></div>
            ))}
          </div>
        </div>

        {/* Kanban */}
        <div>
          <h2 style={{ fontSize:'1.1rem', marginBottom:'1rem' }}>Tablero de Comandas</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'1.25rem' }}>
            
            {[
              { title:'Nuevas', status:'pending_confirm', items:newComandas, color:'#C8A96E', nextStatus:'confirmed', nextLabel:'Confirmar' },
              { title:'En Cocina', status:'confirmed', items:inProgress, color:'#D9A05B', nextStatus:'delivered', nextLabel:'Listo' },
              { title:'Servidas', status:'delivered', items:served, color:'#8E9B77', nextStatus:null, nextLabel:null },
            ].map(col => (
              <div key={col.title}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.625rem 0.875rem', background:'rgba(255,255,255,0.03)', borderRadius:'6px 6px 0 0', borderBottom:`2px solid ${col.color}` }}>
                  <span style={{ fontWeight:600, fontSize:'0.88rem' }}>{col.title}</span>
                  <span style={{ color:col.color, fontWeight:700 }}>{col.items.length}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem', padding:'0.75rem 0', minHeight:'200px' }}>
                  {col.items.map(({ comanda, session: sess }) => {
                    const elapsed = getMinutes(comanda.timestamp);
                    const isLate = elapsed >= 8 && col.status !== 'delivered';
                    return (
                      <div key={comanda.id} style={{ background:'#1A1A1A', border:`1px solid ${isLate ? '#C07070' : 'rgba(255,255,255,0.06)'}`, borderRadius:'8px', padding:'0.875rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                          <strong style={{ fontSize:'0.88rem' }}>{sess.tables?.name}</strong>
                          <span style={{ fontSize:'0.72rem', color: isLate ? '#C07070' : '#A6A19A', display:'flex', alignItems:'center', gap:'0.2rem' }}><Timer size={11}/>{elapsed}m</span>
                        </div>
                        {comanda.items.map((item, i) => (
                          <div key={i} style={{ fontSize:'0.85rem', marginBottom:'0.2rem' }}>
                            <strong>{item.quantity}x</strong> {item.name}
                            {item.notes && <div style={{ fontSize:'0.75rem', color:'#D9A05B', marginLeft:'1rem' }}>⚠️ {item.notes}</div>}
                          </div>
                        ))}
                        {col.nextStatus && (
                          <button onClick={() => updateComandaStatus(sess, comanda.id, col.nextStatus)}
                            style={{ width:'100%', marginTop:'0.625rem', padding:'0.4rem', background: col.status === 'pending_confirm' ? '#C8A96E' : 'none', color: col.status === 'pending_confirm' ? '#0D0D0D' : '#8E9B77', border:`1px solid ${col.status === 'pending_confirm' ? 'transparent' : '#8E9B77'}`, borderRadius:'5px', cursor:'pointer', fontWeight:600, fontSize:'0.78rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem' }}>
                            <Check size={12}/> {col.nextLabel}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {col.items.length === 0 && <p style={{ textAlign:'center', color:'#555', fontSize:'0.82rem', padding:'1rem 0' }}>Sin comandas</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CajaView;
