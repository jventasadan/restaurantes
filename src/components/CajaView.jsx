import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, Receipt, Check, ChefHat, RefreshCw, Map, Timer, LogOut, Volume2, VolumeX, X, ShoppingBag } from 'lucide-react';

// Genera un beep con Web Audio API
function createBeep(ctx, freq = 880, duration = 0.15, volume = 0.4) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = 'square';
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playAlarm(ctx) {
  // Patron doi-doi  doi-doi: 4 pitidos en 2 pares, mas urgente y constante
  createBeep(ctx, 880, 0.10, 0.5);
  setTimeout(() => createBeep(ctx, 880, 0.10, 0.5), 130);
  setTimeout(() => createBeep(ctx, 880, 0.10, 0.5), 380);
  setTimeout(() => createBeep(ctx, 880, 0.10, 0.5), 510);
}

function CajaView() {
  const user = JSON.parse(localStorage.getItem('cv_user') || 'null');
  const [sessions, setSessions] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Alarma
  const [soundOn, setSoundOn] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState(null); // timestamp hasta cuando está silenciada
  const [lastComandaCount, setLastComandaCount] = useState(0);
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  // Mesa detalle
  const [selectedTable, setSelectedTable] = useState(null); // {tbl, session}

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const loadTables = useCallback(async () => {
    const q = user
      ? supabase.from('tables').select('*').eq('restaurant_id', user.restaurant_id)
      : supabase.from('tables').select('*');
    const { data } = await q.order('zone').order('name');
    if (data) setTables(data);
  }, [user?.restaurant_id]);

  const loadSessions = useCallback(async () => {
    const q = user
      ? supabase.from('sessions').select('*, tables(*)').eq('restaurant_id', user.restaurant_id).in('status', ['active', 'cuenta_solicitada', 'cuenta_enviada'])
      : supabase.from('sessions').select('*, tables(*)').in('status', ['active', 'cuenta_solicitada', 'cuenta_enviada']);
    const { data } = await q.order('session_start', { ascending: false });
    if (data) setSessions(data);
  }, [user?.restaurant_id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTables(), loadSessions()]);
    setLoading(false);
  }, [loadTables, loadSessions]);

  // Realtime + polling cada 8 segundos para asegurar actualizaciones
  useEffect(() => {
    loadData();
    const channel = supabase.channel('realtime-caja-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadSessions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => loadTables())
      .subscribe();
    const poll = setInterval(() => loadSessions(), 8000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [loadData]);

  // Alarma - detectar nuevas comandas Y cuenta solicitada
  const getAlarmCount = (sess) =>
    sess.reduce((acc, s) => {
      const pendingOrders = (s.orders || []).filter(o => o.status === 'pending_confirm').length;
      const cuentaPendiente = s.status === 'cuenta_solicitada' ? 1 : 0;
      return acc + pendingOrders + cuentaPendiente;
    }, 0);

  useEffect(() => {
    const newCount = getAlarmCount(sessions);

    // Silenciar si no hay nada pendiente
    if (newCount === 0) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
      setLastComandaCount(0);
      return;
    }

    const ahora = Date.now();
    const enSnooze = snoozedUntil && ahora < snoozedUntil;

    if (!soundOn || enSnooze) {
      setLastComandaCount(newCount);
      return;
    }

    // Si hay algo pendiente y no estamos en snooze → activar alarma periódica
    if (newCount > 0 && !alarmIntervalRef.current) {
      const ctx = getAudioCtx();
      playAlarm(ctx); // primera vez inmediata
      alarmIntervalRef.current = setInterval(() => {
        const stillInSnooze = snoozedUntil && Date.now() < snoozedUntil;
        if (!stillInSnooze && soundOn) {
          const currentCount = getAlarmCount(sessions);
          if (currentCount > 0) playAlarm(ctx);
          else { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
        }
      }, 7000); // repetir cada 7 segundos
    }

    setLastComandaCount(newCount);
  }, [sessions, soundOn, snoozedUntil]);

  const handleSnooze = () => {
    setSnoozedUntil(Date.now() + 5 * 60 * 1000); // 5 minutos
    clearInterval(alarmIntervalRef.current);
    alarmIntervalRef.current = null;
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

  const markCuentaEnviada = async (sess) => {
    const { error } = await supabase.from('sessions').update({ status: 'cuenta_enviada' }).eq('session_id', sess.session_id);
    if (!error) loadSessions();
    else console.error('Error cuenta enviada:', error);
  };

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

  const getTableSession = (tbl) => sessions.find(x => x.table_id === tbl.table_id);

  const getTableColor = (tbl) => {
    const s = getTableSession(tbl);
    if (!s) return '#555'; // libre
    if (s.waiter_requested || s.status === 'cuenta_solicitada' || (s.orders || []).some(o => o.status === 'pending_confirm')) return '#C07070';
    if (s.status === 'cuenta_enviada') return '#D9A05B';
    return '#8E9B77'; // activa normal
  };

  const getMinutes = (ts) => Math.floor((currentTime - new Date(ts)) / 60000);

  const newComandas = getComandasByStatus('pending_confirm');
  const inProgress = getComandasByStatus('confirmed');
  const served = getComandasByStatus('delivered');
  const cuentasSolicitadas = sessions.filter(s => s.status === 'cuenta_solicitada' || s.status === 'cuenta_enviada');
  const snoozeEnActivo = snoozedUntil && Date.now() < snoozedUntil;
  const minutosSnooze = snoozeEnActivo ? Math.ceil((snoozedUntil - Date.now()) / 60000) : 0;

  const logout = () => { localStorage.removeItem('cv_user'); window.location.href = '/auth'; };

  if (loading) return <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', color:'#C8A96E', fontFamily:'Inter,sans-serif' }}>Cargando Panel...</div>;

  return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', fontFamily:'Inter,sans-serif', color:'#FAF7F2' }}>

      {/* HEADER */}
      <header style={{ background:'#1A1A1A', borderBottom:'1px solid rgba(200,169,110,0.15)', padding:'0.875rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <ChefHat size={24} style={{ color:'#C8A96E' }}/>
          <div>
            <h1 style={{ margin:0, fontSize:'1.2rem', color:'#FAF7F2' }}>Panel de Caja y Cocina</h1>
            <p style={{ margin:0, fontSize:'0.75rem', color:'#A6A19A' }}>Actualización automática · {user?.restaurant_id || ''}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.625rem', alignItems:'center', flexWrap:'wrap' }}>
          {/* Control sonido */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'0.35rem 0.625rem' }}>
            <button onClick={() => setSoundOn(s => !s)} style={{ background:'none', border:'none', color: soundOn ? '#C8A96E' : '#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.8rem' }}>
              {soundOn ? <Volume2 size={14}/> : <VolumeX size={14}/>}
              {soundOn ? 'Sonido ON' : 'Sonido OFF'}
            </button>
            {soundOn && newComandas.length > 0 && !snoozeEnActivo && (
              <button onClick={handleSnooze} style={{ background:'rgba(200,169,110,0.15)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'5px', color:'#C8A96E', cursor:'pointer', fontSize:'0.72rem', padding:'0.2rem 0.5rem' }}>
                ⏸ Pausar 5min
              </button>
            )}
            {snoozeEnActivo && (
              <span style={{ color:'#D9A05B', fontSize:'0.72rem' }}>⏸ {minutosSnooze}min</span>
            )}
          </div>
          <button onClick={loadData} style={{ padding:'0.45rem 0.875rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#FAF7F2', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.82rem' }}><RefreshCw size={13}/>Refrescar</button>
          <a href="/admin" style={{ padding:'0.45rem 0.875rem', background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', textDecoration:'none', fontSize:'0.82rem' }}>Admin</a>
          {user && <button onClick={logout} style={{ padding:'0.45rem 0.625rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#A6A19A', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.82rem' }}><LogOut size={13}/> Salir</button>}
        </div>
      </header>

      <div style={{ padding:'1.25rem', maxWidth:'1400px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

        {/* ALERTAS URGENTES */}
        {(sessions.some(s => s.waiter_requested || s.status === 'cuenta_solicitada' || s.status === 'cuenta_enviada')) && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.25rem' }}>
            {sessions.some(s => s.waiter_requested) && (
              <div style={{ background:'rgba(192,112,112,0.06)', border:'1px solid rgba(192,112,112,0.25)', borderRadius:'10px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.9rem', color:'#C07070', display:'flex', alignItems:'center', gap:'0.5rem', margin:'0 0 0.75rem' }}><Bell size={15}/> Solicita camarero</h3>
                {sessions.filter(s => s.waiter_requested).map(s => (
                  <div key={s.session_id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#1A1A1A', padding:'0.6rem 0.875rem', borderRadius:'6px', marginBottom:'0.4rem' }}>
                    <div>
                      <strong style={{ fontSize:'0.88rem' }}>{s.tables?.name}</strong>
                      <div style={{ fontSize:'0.7rem', color:'#A6A19A' }}>Hace {getMinutes(s.last_interaction)} min</div>
                    </div>
                    <button onClick={() => resolveWaiterCall(s)} style={{ padding:'0.3rem 0.7rem', background:'#8E9B77', border:'none', borderRadius:'5px', color:'#0D0D0D', cursor:'pointer', fontWeight:600, fontSize:'0.75rem' }}>Atender</button>
                  </div>
                ))}
              </div>
            )}
            {cuentasSolicitadas.length > 0 && (
              <div style={{ background:'rgba(200,169,110,0.06)', border:'1px solid rgba(200,169,110,0.25)', borderRadius:'10px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.9rem', color:'#C8A96E', display:'flex', alignItems:'center', gap:'0.5rem', margin:'0 0 0.75rem' }}><Receipt size={15}/> Cuentas</h3>
                {cuentasSolicitadas.map(s => {
                  const total = (s.orders || []).reduce((a, o) => a + (o.items || []).reduce((b, i) => b + (i.price * i.quantity), 0), 0);
                  const esCuentaEnviada = s.status === 'cuenta_enviada';
                  return (
                    <div key={s.session_id} style={{ background:'#1A1A1A', padding:'0.75rem', borderRadius:'6px', marginBottom:'0.4rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                        <div>
                          <strong style={{ fontSize:'0.88rem' }}>{s.tables?.name}</strong>
                          <div style={{ fontSize:'0.78rem', color:'#C8A96E', fontWeight:600 }}>{total.toFixed(2)}€</div>
                        </div>
                        <span style={{ fontSize:'0.7rem', padding:'0.2rem 0.5rem', borderRadius:'4px', background: esCuentaEnviada ? 'rgba(142,155,119,0.2)' : 'rgba(200,169,110,0.2)', color: esCuentaEnviada ? '#8E9B77' : '#C8A96E' }}>
                          {esCuentaEnviada ? '📋 En mesa' : '🔔 Solicitada'}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        {!esCuentaEnviada && (
                          <button onClick={() => markCuentaEnviada(s)} style={{ flex:1, padding:'0.4rem', background:'rgba(200,169,110,0.15)', border:'1px solid rgba(200,169,110,0.4)', borderRadius:'5px', color:'#C8A96E', cursor:'pointer', fontWeight:600, fontSize:'0.75rem' }}>
                            📄 Cuenta enviada
                          </button>
                        )}
                        <button onClick={() => markCuentaPagada(s)} style={{ flex:1, padding:'0.4rem', background:'#8E9B77', border:'none', borderRadius:'5px', color:'#0D0D0D', cursor:'pointer', fontWeight:700, fontSize:'0.75rem' }}>
                          ✅ Pagada
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MAPA DE MESAS — clickable */}
        <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'1.25rem' }}>
          <h3 style={{ fontSize:'0.9rem', margin:'0 0 1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}><Map size={15}/> Mapa de Mesas <span style={{ color:'#555', fontSize:'0.75rem', fontWeight:400 }}>(pulsa una mesa para ver detalle)</span></h3>
          {['interior', 'terraza', 'privado'].map(zona => {
            const mesasZona = tables.filter(t => t.zone === zona || (zona === 'interior' && (!t.zone || t.zone === 'salon')));
            if (mesasZona.length === 0) return null;
            const zonaLabel = zona === 'interior' ? '🏠 Salón' : zona === 'terraza' ? '☀️ Terraza' : '🚪 Privado';
            const zonaColor = zona === 'terraza' ? '#D9A05B' : zona === 'privado' ? '#A6A19A' : '#C8A96E';
            return (
              <div key={zona} style={{ marginBottom:'1rem' }}>
                <div style={{ fontSize:'0.78rem', color: zonaColor, fontWeight:600, marginBottom:'0.5rem', borderBottom:`1px solid rgba(255,255,255,0.05)`, paddingBottom:'0.3rem' }}>{zonaLabel}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.625rem' }}>
                  {mesasZona.map(tbl => {
                    const color = getTableColor(tbl);
                    const s = getTableSession(tbl);
                    const hasPendiente = s && (s.orders || []).some(o => o.status === 'pending_confirm');
                    return (
                      <div key={tbl.table_id}
                        onClick={() => setSelectedTable({ tbl, session: s })}
                        style={{ border:`2px solid ${color}`, borderRadius:'8px', padding:'0.5rem 0.875rem', minWidth:'85px', textAlign:'center', cursor:'pointer', background: hasPendiente ? 'rgba(192,112,112,0.06)' : 'transparent', transition:'all 0.15s', userSelect:'none' }}>
                        <div style={{ fontWeight:700, fontSize:'0.85rem' }}>{tbl.name}</div>
                        <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:color, margin:'0.3rem auto' }}/>
                        <div style={{ fontSize:'0.6rem', color: color }}>
                          {!s ? 'Libre' : s.status === 'cuenta_solicitada' ? 'Pide cuenta' : s.status === 'cuenta_enviada' ? 'Cuenta en mesa' : hasPendiente ? 'Nueva comanda' : 'Activa'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display:'flex', gap:'1.25rem', marginTop:'0.875rem', fontSize:'0.72rem', flexWrap:'wrap' }}>
            {[['#555','Libre'],['#8E9B77','Activa'],['#D9A05B','Cuenta'],['#C07070','Acción pendiente']].map(([c,l]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}><div style={{ width:'7px', height:'7px', borderRadius:'50%', background:c }}/><span style={{ color:'#A6A19A' }}>{l}</span></div>
            ))}
          </div>
        </div>

        {/* TABLERO DE COMANDAS */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
            <h2 style={{ fontSize:'1.05rem', margin:0 }}>Tablero de Comandas</h2>
            {newComandas.length > 0 && (
              <div style={{ background:'rgba(192,112,112,0.1)', border:'1px solid rgba(192,112,112,0.3)', borderRadius:'6px', padding:'0.3rem 0.75rem', color:'#C07070', fontSize:'0.82rem', fontWeight:600, display:'flex', alignItems:'center', gap:'0.4rem' }}>
                🔔 {newComandas.length} nueva{newComandas.length > 1 ? 's' : ''} comanda{newComandas.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'1.25rem' }}>
            {[
              { title:'Nuevas', status:'pending_confirm', items:newComandas, color:'#C8A96E', nextStatus:'confirmed', nextLabel:'Comandada' },
              { title:'Comandada', status:'confirmed', items:inProgress, color:'#D9A05B', nextStatus:'delivered', nextLabel:'Servida' },
              { title:'Servidas', status:'delivered', items:served, color:'#8E9B77', nextStatus:null, nextLabel:null },
            ].map(col => (
              <div key={col.title}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0.875rem', background:'rgba(255,255,255,0.03)', borderRadius:'6px 6px 0 0', borderBottom:`2px solid ${col.color}` }}>
                  <span style={{ fontWeight:600, fontSize:'0.88rem' }}>{col.title}</span>
                  <span style={{ color:col.color, fontWeight:700, fontSize:'0.95rem' }}>{col.items.length}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem', padding:'0.75rem 0', minHeight:'180px' }}>
                  {col.items.map(({ comanda, session: sess }) => {
                    const elapsed = getMinutes(comanda.timestamp);
                    const isLate = elapsed >= 8 && col.status !== 'delivered';
                    return (
                      <div key={comanda.id} style={{ background:'#1A1A1A', border:`1px solid ${isLate ? '#C07070' : 'rgba(255,255,255,0.06)'}`, borderRadius:'8px', padding:'0.875rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                          <strong style={{ fontSize:'0.88rem' }}>{sess.tables?.name}</strong>
                          <span style={{ fontSize:'0.7rem', color: isLate ? '#C07070' : '#A6A19A', display:'flex', alignItems:'center', gap:'0.2rem' }}><Timer size={11}/>{elapsed}m</span>
                        </div>
                        {comanda.items.map((item, i) => (
                          <div key={i} style={{ fontSize:'0.84rem', marginBottom:'0.35rem' }}>
                            <strong>{item.quantity}x</strong> {item.name}
                            {(item.notes || item.description) && <div style={{ fontSize:'0.73rem', color:'#D9A05B', marginLeft:'1rem', marginTop:'0.1rem' }}>{item.notes || item.description}</div>}
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
                  {col.items.length === 0 && <p style={{ textAlign:'center', color:'#444', fontSize:'0.8rem', padding:'1rem 0' }}>Sin comandas</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DETALLE MESA */}
      {selectedTable && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}
          onClick={e => e.target === e.currentTarget && setSelectedTable(null)}>
          <div style={{ background:'#1A1A1A', border:'1px solid rgba(200,169,110,0.2)', borderRadius:'12px', padding:'1.5rem', width:'100%', maxWidth:'480px', maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <div>
                <h3 style={{ margin:0, color:'#C8A96E', fontSize:'1.1rem' }}>{selectedTable.tbl.name}</h3>
                <div style={{ fontSize:'0.78rem', color:'#A6A19A' }}>{selectedTable.tbl.zone === 'interior' ? 'Salón' : selectedTable.tbl.zone || ''}</div>
              </div>
              <button onClick={() => setSelectedTable(null)} style={{ background:'none', border:'none', color:'#A6A19A', cursor:'pointer' }}><X size={20}/></button>
            </div>

            {!selectedTable.session ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'#555' }}>
                <ShoppingBag size={32} style={{ margin:'0 auto 0.75rem', display:'block', opacity:0.3 }}/>
                <p style={{ margin:0 }}>Mesa libre — sin sesión activa</p>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.75rem', padding:'0.25rem 0.6rem', borderRadius:'4px', background:'rgba(200,169,110,0.1)', color:'#C8A96E' }}>
                    Inicio: {new Date(selectedTable.session.session_start).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })}
                  </span>
                  <span style={{ fontSize:'0.75rem', padding:'0.25rem 0.6rem', borderRadius:'4px', background:'rgba(255,255,255,0.05)', color:'#A6A19A' }}>
                    {selectedTable.session.status === 'cuenta_solicitada' ? '🔔 Pide cuenta' : selectedTable.session.status === 'cuenta_enviada' ? '📋 Cuenta en mesa' : '✅ Activa'}
                  </span>
                </div>

                {(selectedTable.session.orders || []).length === 0 ? (
                  <p style={{ color:'#555', textAlign:'center', padding:'1rem 0' }}>Sin pedidos todavía</p>
                ) : (
                  <>
                    <h4 style={{ color:'#FAF7F2', fontSize:'0.88rem', marginBottom:'0.75rem' }}>Consumido:</h4>
                    {selectedTable.session.orders.map((comanda, ci) => (
                      <div key={ci} style={{ background:'#0D0D0D', borderRadius:'8px', padding:'0.75rem', marginBottom:'0.5rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem' }}>
                          <span style={{ fontSize:'0.72rem', color:'#A6A19A' }}>Comanda {ci + 1} · {new Date(comanda.timestamp).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })}</span>
                          <span style={{ fontSize:'0.7rem', padding:'0.15rem 0.4rem', borderRadius:'4px', background: comanda.status === 'pending_confirm' ? 'rgba(200,169,110,0.15)' : comanda.status === 'confirmed' ? 'rgba(217,160,91,0.15)' : 'rgba(142,155,119,0.15)', color: comanda.status === 'pending_confirm' ? '#C8A96E' : comanda.status === 'confirmed' ? '#D9A05B' : '#8E9B77' }}>
                            {comanda.status === 'pending_confirm' ? 'Nueva' : comanda.status === 'confirmed' ? 'Comandada' : 'Servida'}
                          </span>
                        </div>
                        {(comanda.items || []).map((item, i) => (
                          <div key={i} style={{ fontSize:'0.85rem', padding:'0.2rem 0' }}>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                              <span><strong>{item.quantity}x</strong> {item.name}</span>
                              <span style={{ color:'#C8A96E' }}>{((item.price || 0) * item.quantity).toFixed(2)}€</span>
                            </div>
                            {(item.notes || item.description) && <div style={{ fontSize:'0.75rem', color:'#D9A05B', paddingLeft:'1rem', marginTop:'0.1rem' }}>{item.notes || item.description}</div>}
                          </div>
                        ))}
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'0.75rem', marginTop:'0.5rem' }}>
                      <strong>Total</strong>
                      <strong style={{ color:'#C8A96E', fontSize:'1.05rem' }}>
                        {(selectedTable.session.orders || []).reduce((a, o) => a + (o.items || []).reduce((b, i) => b + ((i.price || 0) * i.quantity), 0), 0).toFixed(2)}€
                      </strong>
                    </div>
                  </>
                )}

                {/* Botones de cuenta en el modal */}
                {(selectedTable.session.status === 'cuenta_solicitada' || selectedTable.session.status === 'cuenta_enviada') && (
                  <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.25rem' }}>
                    {selectedTable.session.status === 'cuenta_solicitada' && (
                      <button onClick={() => { markCuentaEnviada(selectedTable.session); setSelectedTable(null); }} style={{ flex:1, padding:'0.7rem', background:'rgba(200,169,110,0.15)', border:'1px solid rgba(200,169,110,0.4)', borderRadius:'8px', color:'#C8A96E', cursor:'pointer', fontWeight:600, fontSize:'0.85rem' }}>
                        📄 Cuenta enviada
                      </button>
                    )}
                    <button onClick={() => { markCuentaPagada(selectedTable.session); setSelectedTable(null); }} style={{ flex:1, padding:'0.7rem', background:'#8E9B77', border:'none', borderRadius:'8px', color:'#0D0D0D', cursor:'pointer', fontWeight:700, fontSize:'0.85rem' }}>
                      ✅ Pagada
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CajaView;
