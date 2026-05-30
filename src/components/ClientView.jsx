import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  MessageSquare, 
  Utensils, 
  UserRoundCheck, 
  ShoppingBag, 
  ChevronRight, 
  Send, 
  Bell, 
  Receipt,
  ArrowLeft,
  X,
  Plus,
  Minus
} from 'lucide-react';

// Abreviaturas de alérgenos minimalistas sin emojis
const ALLERGEN_MAP = {
  gluten: { label: 'GL', name: 'Gluten' },
  lacteos: { label: 'LA', name: 'Lácteos' },
  pescado: { label: 'PE', name: 'Pescado' },
  marisco: { label: 'MA', name: 'Marisco' },
  huevo: { label: 'HU', name: 'Huevo' },
  'frutos de cascara': { label: 'FR', name: 'Frutos Cáscara' },
  cacahuetes: { label: 'CA', name: 'Cacahuete' },
  soja: { label: 'SO', name: 'Soja' },
  mostaza: { label: 'MO', name: 'Mostaza' },
  sesamo: { label: 'SE', name: 'Sésamo' },
  sulfitos: { label: 'SU', name: 'Sulfitos' },
  altramuces: { label: 'AL', name: 'Altramuces' },
  moluscos: { label: 'MS', name: 'Moluscos' },
  apio: { label: 'AP', name: 'Apio' }
};

function ClientView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const restaurantId = searchParams.get('r');
  const tableId = searchParams.get('t');

  // Estados de carga y error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Datos de base de datos
  const [restaurant, setRestaurant] = useState(null);
  const [branding, setBranding] = useState(null);
  const [table, setTable] = useState(null);
  const [session, setSession] = useState(null);
  const [menuItems, setMenuItems] = useState([]);

  // Estados de la interfaz
  const [mode, setMode] = useState(null); // 'welcome' | 'chat' | 'menu' | 'waiter'
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [cart, setCart] = useState([]); // [{ item, quantity, notes, status: 'pending' }]
  const [cartOpen, setCartOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. Cargar datos iniciales
  useEffect(() => {
    if (!restaurantId || !tableId) {
      setError("Código QR inválido. Faltan parámetros de restaurante o mesa.");
      setLoading(false);
      return;
    }
    loadData();
  }, [restaurantId, tableId]);

  // Hacer scroll automático al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Obtener restaurante
      const { data: rest, error: rErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();
      if (rErr || !rest) throw new Error("No se encontró el restaurante.");
      setRestaurant(rest);

      // Obtener branding
      const { data: brand, error: bErr } = await supabase
        .from('restaurant_branding')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();
      if (brand) {
        setBranding(brand);
        // Aplicar variables CSS de marca dinámicamente
        document.documentElement.style.setProperty('--color-primary', brand.primary_color);
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '200, 169, 110';
        };
        document.documentElement.style.setProperty('--color-primary-rgb', hexToRgb(brand.primary_color));
      }

      // Obtener mesa
      const { data: tbl, error: tErr } = await supabase
        .from('tables')
        .select('*')
        .eq('table_id', tableId)
        .eq('restaurant_id', restaurantId)
        .single();
      if (tErr || !tbl) throw new Error("No se encontró la mesa especificada.");
      setTable(tbl);

      // Obtener o crear sesión activa
      let activeSession = null;
      const { data: existingSessions, error: sErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_id', tableId)
        .eq('restaurant_id', restaurantId)
        .in('status', ['active', 'cuenta_solicitada'])
        .order('session_start', { ascending: false });

      if (existingSessions && existingSessions.length > 0) {
        activeSession = existingSessions[0];
      } else {
        // Crear sesión limpia
        const newSessionId = `session-${restaurantId}-${tableId}-${Date.now()}`;
        const { data: newSession, error: createErr } = await supabase
          .from('sessions')
          .insert({
            session_id: newSessionId,
            table_id: tableId,
            restaurant_id: restaurantId,
            status: 'active',
            waiter_requested: false,
            orders: []
          })
          .select()
          .single();
        if (createErr) throw createErr;
        activeSession = newSession;
      }
      
      setSession(activeSession);
      
      // Mapear los items ya confirmados
      if (activeSession && activeSession.orders) {
        const confirmedItems = activeSession.orders;
        // Al re-escanear, si hay pedidos confirmados, saludamos al usuario
        if (confirmedItems.length > 0) {
          const itemsList = confirmedItems
            .map(c => c.items.map(i => `${i.quantity}x ${i.name}`).join(', '))
            .join(', ');
          
          setChatMessages([
            {
              role: 'assistant',
              content: `¡Hola de nuevo! Veo que tenéis una sesión activa en esta mesa. Ya habéis pedido: ${itemsList}. ¿Deseáis añadir algo más a la comanda o preferís ver la carta?`
            }
          ]);
        } else {
          setChatMessages([
            {
              role: 'assistant',
              content: rest.welcome_message
            }
          ]);
        }
      }

      // Si el camarero ya estaba solicitado, mandarlo al modo camarero
      if (activeSession?.waiter_requested) {
        setMode('waiter');
      } else {
        setMode('welcome');
      }

      // Obtener platos
      const { data: items, error: mErr } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('available', true);
      if (mErr) throw mErr;
      setMenuItems(items);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Suscripción Realtime para actualizar la sesión en vivo (p.ej. si el encargado la cierra)
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session-${session.session_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `session_id=eq.${session.session_id}` },
        (payload) => {
          setSession(payload.new);
          if (payload.new.status === 'closed') {
            // Sesión cerrada por caja
            alert("El camarero ha cerrado la cuenta de la mesa. ¡Gracias por su visita!");
            navigate('/');
          }
          if (payload.new.waiter_requested) {
            setMode('waiter');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // 2. Lógica del Carrito Manual
  const addToCart = (item, quantity = 1, notes = '') => {
    setCart((prev) => {
      const existing = prev.find(i => i.item.id === item.id && i.notes === notes);
      if (existing) {
        return prev.map(i => i.item.id === item.id && i.notes === notes 
          ? { ...i, quantity: i.quantity + quantity } 
          : i
        );
      }
      return [...prev, { item, quantity, notes, status: 'pending' }];
    });
  };

  const updateCartQuantity = (item, notes, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(i => !(i.item.id === item.id && i.notes === notes)));
    } else {
      setCart(prev => prev.map(i => i.item.id === item.id && i.notes === notes 
        ? { ...i, quantity } 
        : i
      ));
    }
  };

  // 3. Confirmar Pedido (Envío a Supabase)
  const confirmOrder = async () => {
    if (cart.length === 0) return;

    try {
      const comanda = {
        id: `comanda-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'pending_confirm', // Pendiente de confirmar por caja
        items: cart.map(i => ({
          id: i.item.id,
          name: i.item.name,
          price: i.item.price,
          quantity: i.quantity,
          notes: i.notes
        }))
      };

      const updatedOrders = [...(session.orders || []), comanda];

      const { data: newSession, error: uErr } = await supabase
        .from('sessions')
        .update({
          orders: updatedOrders,
          last_interaction: new Date().toISOString()
        })
        .eq('session_id', session.session_id)
        .select()
        .single();

      if (uErr) throw uErr;

      setSession(newSession);
      setCart([]); // Vaciar carrito manual
      setCartOpen(false);

      // Añadir mensaje de confirmación al chat
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "¡Perfecto! He enviado tu comanda a la barra. En un momento vendrán a servírtelo. Puedes seguir añadiendo cosas si lo deseas."
        }
      ]);
      setMode('chat'); // Redirigir al chat
      alert("¡Comanda enviada con éxito!");

    } catch (err) {
      console.error(err);
      alert("Error al confirmar el pedido: " + err.message);
    }
  };

  // 4. Solicitar Cuenta
  const requestBill = async () => {
    try {
      const { data: newSession, error: uErr } = await supabase
        .from('sessions')
        .update({
          status: 'cuenta_solicitada',
          last_interaction: new Date().toISOString()
        })
        .eq('session_id', session.session_id)
        .select()
        .single();

      if (uErr) throw uErr;

      setSession(newSession);
      setBillRequested(true);
      setCartOpen(false);

      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "He avisado al camarero para que te traiga la cuenta. Mientras tanto, puedes seguir en la mesa. ¡Esperamos que hayas disfrutado de tu comida!"
        }
      ]);

    } catch (err) {
      console.error(err);
      alert("Error al solicitar la cuenta: " + err.message);
    }
  };

  // 5. Llamar al Camarero Físico (Desactiva asistente)
  const callPhysicalWaiter = async () => {
    try {
      const { error: uErr } = await supabase
        .from('sessions')
        .update({
          waiter_requested: true,
          last_interaction: new Date().toISOString()
        })
        .eq('session_id', session.session_id);

      if (uErr) throw uErr;

      setMode('waiter');
    } catch (err) {
      console.error(err);
      alert("Error al llamar al camarero: " + err.message);
    }
  };

  // 6. Conversación con Claude (Llamada al Proxy local / Edge Function)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || chatLoading) return;

    const userText = inputValue;
    setInputValue('');
    setChatLoading(true);

    // Añadir mensaje del usuario inmediatamente en la vista
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);

    try {
      // Estructurar el historial para Claude API (enviamos los últimos 8 mensajes)
      const historyFormatted = chatMessages.slice(-8).map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }));

      const res = await fetch('/api/chat-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          table_id: tableId,
          session_id: session.session_id,
          message: userText,
          history: historyFormatted
        })
      });

      if (!res.ok) {
        throw new Error("No se pudo obtener respuesta del camarero virtual.");
      }

      const data = await res.json();
      
      // Mostrar respuesta de Claude
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply }
      ]);

      // Si Claude ejecuta alguna herramienta (Tool), procesarla
      if (data.action) {
        const { name, input } = data.action;
        console.log("Acción ejecutada por Claude:", name, input);

        if (name === 'update_cart') {
          // Claude actualiza la lista de items con búsqueda flexible
          input.items.forEach(actionItem => {
            const searchName = actionItem.name.toLowerCase().trim();
            // Búsqueda: exacta → parcial → incluye
            let menuItem = menuItems.find(i => i.name.toLowerCase() === searchName)
              || menuItems.find(i => i.name.toLowerCase().includes(searchName) || searchName.includes(i.name.toLowerCase()))
              || menuItems.find(i => i.name.toLowerCase().split(' ').some(w => searchName.includes(w) && w.length > 3));
            
            if (!menuItem) {
              // Crear ítem genérico para que llegue al panel de caja
              menuItem = { id: 'custom-' + Date.now(), name: actionItem.name, price: 0, category: 'General', allergens: [] };
            }
            
            if (actionItem.quantity <= 0) {
              updateCartQuantity(menuItem, actionItem.notes || '', 0);
            } else {
              addToCart(menuItem, actionItem.quantity, actionItem.notes || '');
            }
          });
          setCartOpen(true);
        } else if (name === 'call_waiter') {
          await callPhysicalWaiter();
        } else if (name === 'request_bill') {
          await requestBill();
        }
      }

    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Lo siento, he tenido un problema de conexión para procesar tu solicitud. ¿Me lo puedes repetir?" }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Filtrar categorías únicas de platos
  const categories = ['Todos', ...new Set(menuItems.map(item => item.category))];

  const filteredMenuItems = activeCategory === 'Todos'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  // Calcular totales del carrito
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

  // Calcular totales de comandas ya enviadas
  const confirmedSubtotal = session?.orders?.reduce((acc, order) => {
    return acc + order.items.reduce((itemAcc, item) => itemAcc + (item.price * item.quantity), 0);
  }, 0) || 0;

  const grandTotal = cartSubtotal + confirmedSubtotal;

  if (loading) {
    return (
      <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem', color: '#C8A96E' }}>Cargando Experiencia...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <h2 style={{ color: '#C07070', marginBottom: '1rem' }}>Error de Conexión</h2>
        <p className="text-muted" style={{ marginBottom: '2rem', textAlign: 'center' }}>{error}</p>
        <button onClick={() => navigate('/')} className="btn">Volver al Inicio</button>
      </div>
    );
  }

  // ----------------------------------------------------
  // MODO: CAMARERO SOLICITADO (waiter)
  // ----------------------------------------------------
  if (mode === 'waiter') {
    return (
      <div className="theme-warm" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: '#FAF7F2' }}>
        <div style={{ margin: 'auto', maxWidth: '450px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'rgba(200, 169, 110, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#C8A96E',
            margin: '0 auto'
          }}>
            <Bell size={40} className="text-accent" />
          </div>
          <h2 style={{ fontSize: '2rem', color: '#1A1A1A' }}>Camarero en camino</h2>
          <p className="text-muted" style={{ fontSize: '1rem', color: '#5C564E' }}>
            Hemos enviado un aviso prioritario a nuestro equipo. Un camarero se acercará a la <strong>{table.name}</strong> a la mayor brevedad para atenderos personalmente.
          </p>
          <div className="surface card" style={{ textAlign: 'left', padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem', color: '#1A1A1A' }}>Detalles de la mesa:</h4>
            <p style={{ fontSize: '0.85rem' }}><strong>Local:</strong> {restaurant.name}</p>
            <p style={{ fontSize: '0.85rem' }}><strong>Zona:</strong> {table.zone === 'interior' ? 'Salón Interior' : 'Terraza'}</p>
          </div>
          {confirmedSubtotal > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.5rem 0', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <span style={{ fontSize: '0.9rem' }}>Consumo acumulado: </span>
              <strong style={{ color: '#C8A96E', fontSize: '1.1rem' }}>{confirmedSubtotal.toFixed(2)}€</strong>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MODO: BIENVENIDA (welcome)
  // ----------------------------------------------------
  if (mode === 'welcome') {
    return (
      <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D' }}>
        <div style={{ 
          height: '240px', 
          width: '100%', 
          backgroundImage: `linear-gradient(to bottom, rgba(13,13,13,0.3), #0D0D0D), url(${branding?.hero_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} />

        <div style={{ 
          padding: '0 2rem 3rem 2rem', 
          marginTop: '-40px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center',
          flexGrow: 1
        }}>
          {branding?.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Logo" 
              style={{ 
                width: '90px', 
                height: '90px', 
                borderRadius: '50%', 
                border: '3px solid #C8A96E', 
                objectFit: 'cover',
                background: '#1A1A1A',
                marginBottom: '1.5rem'
              }} 
            />
          )}

          <span className="text-accent" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            {restaurant.name}
          </span>
          <h2 style={{ fontSize: '1.8rem', color: '#FAF7F2', marginBottom: '0.5rem' }}>{table.name}</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '350px', marginBottom: '3rem', color: '#A6A19A' }}>
            {table.zone === 'terraza' ? 'Zona Terraza Climatizada' : 'Salón Principal'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '350px', margin: 'auto 0 0 0' }}>
            <button 
              onClick={() => setMode('chat')} 
              className="btn btn-primary"
              style={{ padding: '1rem' }}
            >
              <MessageSquare size={18} />
              Asistente Conversacional
            </button>
            <button 
              onClick={() => setMode('menu')} 
              className="btn"
              style={{ padding: '1rem', border: '1px solid rgba(200, 169, 110, 0.4)' }}
            >
              <Utensils size={18} />
              Ver Carta y Pedir
            </button>
            <button 
              onClick={callPhysicalWaiter} 
              className="btn"
              style={{ padding: '0.8rem', border: 'none', color: '#A6A19A', fontSize: '0.85rem' }}
            >
              <UserRoundCheck size={16} />
              Llamar Camarero Físico
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PANTALLAS PRINCIPALES: CHAT Y CARTA (Navegables)
  // ----------------------------------------------------
  return (
    <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D', paddingBottom: '90px' }}>
      
      {/* Header Fijo */}
      <header style={{ 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid rgba(200, 169, 110, 0.15)',
        background: '#1A1A1A',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => setMode('welcome')} 
            style={{ border: 'none', padding: '0.25rem', color: '#FAF7F2' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#FAF7F2' }}>{restaurant.name}</h3>
            <span style={{ fontSize: '0.8rem', color: '#C8A96E' }}>{table.name}</span>
          </div>
        </div>

        {/* Botones de acción rápidos */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={callPhysicalWaiter} 
            title="Llamar Camarero" 
            style={{ 
              padding: '0.5rem', 
              borderRadius: '50%', 
              width: '38px', 
              height: '38px',
              borderColor: 'rgba(255, 255, 255, 0.1)' 
            }}
          >
            <Bell size={16} />
          </button>
          <button 
            onClick={requestBill} 
            disabled={session.status === 'cuenta_solicitada'}
            title="Pedir Cuenta" 
            style={{ 
              padding: '0.5rem', 
              borderRadius: '50%', 
              width: '38px', 
              height: '38px',
              borderColor: 'rgba(200, 169, 110, 0.4)',
              color: session.status === 'cuenta_solicitada' ? '#8E9B77' : '#C8A96E',
              opacity: session.status === 'cuenta_solicitada' ? 0.5 : 1
            }}
          >
            <Receipt size={16} />
          </button>
        </div>
      </header>

      {/* Tabs de Selección de Modo (Chat / Carta) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        background: '#131313', 
        padding: '0.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button 
          onClick={() => setMode('chat')}
          style={{ 
            padding: '0.75rem', 
            borderRadius: '8px', 
            background: mode === 'chat' ? '#1A1A1A' : 'transparent',
            border: 'none',
            color: mode === 'chat' ? '#C8A96E' : '#A6A19A',
            fontWeight: mode === 'chat' ? 600 : 400
          }}
        >
          <MessageSquare size={16} style={{ marginRight: '0.5rem' }} />
          Chat con {restaurant.assistant_name}
        </button>
        <button 
          onClick={() => setMode('menu')}
          style={{ 
            padding: '0.75rem', 
            borderRadius: '8px', 
            background: mode === 'menu' ? '#1A1A1A' : 'transparent',
            border: 'none',
            color: mode === 'menu' ? '#C8A96E' : '#A6A19A',
            fontWeight: mode === 'menu' ? 600 : 400
          }}
        >
          <Utensils size={16} style={{ marginRight: '0.5rem' }} />
          Carta Digital
        </button>
      </div>

      {/* ----------------------------------------------------
          VISTA: CHAT (Asistente IA)
          ---------------------------------------------------- */}
      {mode === 'chat' && (
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
          {/* Listado de mensajes */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {chatMessages.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className="chat-bubble chat-bubble-assistant" style={{ opacity: 0.6 }}>
                <span className="text-muted">El camarero está redactando...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de Entrada */}
          <form onSubmit={handleSendMessage} className="chat-input-area" style={{ background: '#1A1A1A' }}>
            <input 
              type="text" 
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Pregunta a ${restaurant.assistant_name} o añade platos...`}
              disabled={chatLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '48px', height: '48px', padding: 0, borderRadius: '50%' }}
              disabled={chatLoading || !inputValue.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------
          VISTA: CARTA (Carta Navegable)
          ---------------------------------------------------- */}
      {mode === 'menu' && (
        <div className="container" style={{ padding: '1rem 1.5rem' }}>
          
          {/* Scroll Horizontal de Categorías */}
          <div className="category-tabs">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grilla de Platos */}
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            {filteredMenuItems.map((item) => (
              <div key={item.id} className="surface card menu-item-card" style={{ padding: 0, overflow: 'hidden' }}>
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="menu-item-img" style={{ height: '140px' }} />
                )}
                <div className="menu-item-content" style={{ padding: '1rem' }}>
                  <div className="menu-item-header">
                    <h4 style={{ fontSize: '1.05rem', color: '#FAF7F2', fontWeight: 600 }}>{item.name}</h4>
                    <span className="menu-item-price">{item.price}€</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem', color: '#A6A19A', lineHeight: 1.4 }}>
                    {item.description || 'Sin descripción.'}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    {/* Alérgenos */}
                    <div className="allergens-list" style={{ padding: 0, marginTop: 0 }}>
                      {item.allergens && item.allergens.map((alg) => {
                        const info = ALLERGEN_MAP[alg.toLowerCase().trim()];
                        if (!info) return null;
                        return (
                          <span 
                            key={alg} 
                            className="allergen-icon" 
                            title={info.name}
                            style={{ width: '22px', height: '22px', fontSize: '0.65rem' }}
                          >
                            {info.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Botón Añadir */}
                    <button 
                      onClick={() => addToCart(item, 1)}
                      className="btn"
                      style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      <Plus size={14} style={{ marginRight: '0.2rem' }} />
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          CARRITO FLOTANTE (Siempre visible al tener items)
          ---------------------------------------------------- */}
      {(cart.length > 0 || confirmedSubtotal > 0) && (
        <div 
          className="cart-floating"
          onClick={() => setCartOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              background: '#C8A96E', 
              color: '#0D0D0D', 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600
            }}>
              {cart.reduce((acc, curr) => acc + curr.quantity, 0)}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#FAF7F2', fontWeight: 500 }}>Mi comanda</div>
              <div style={{ fontSize: '0.75rem', color: '#A6A19A' }}>
                {cart.length > 0 ? `${cart.length} nuevos platos` : 'Comanda en cocina'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem', color: '#C8A96E', fontWeight: 600 }}>{grandTotal.toFixed(2)}€</span>
            <ChevronRight size={18} style={{ color: '#C8A96E' }} />
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL DETALLE: CARRITO / COMANDA COMPLETA
          ---------------------------------------------------- */}
      {cartOpen && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'rgba(0,0,0,0.7)', 
          zIndex: 200,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div className="surface" style={{ 
            width: '100%', 
            maxWidth: '480px', 
            height: '100%', 
            background: '#1A1A1A', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: 'var(--shadow-medium)'
          }}>
            {/* Cabecera Modal */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#FAF7F2' }}>Resumen de Mesa</h3>
              <button 
                onClick={() => setCartOpen(false)}
                style={{ border: 'none', color: '#FAF7F2', background: 'transparent' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Listado de platos */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Sección 1: En preparación (Carrito manual) */}
              {cart.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#C8A96E', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                    Por confirmar (en el carrito)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {cart.map((cartItem) => (
                      <div key={`${cartItem.item.id}-${cartItem.notes}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flexGrow: 1, marginRight: '1rem' }}>
                          <div style={{ color: '#FAF7F2', fontWeight: 500, fontSize: '0.95rem' }}>{cartItem.item.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#C8A96E' }}>{cartItem.item.price}€ / ud</div>
                          {cartItem.notes && (
                            <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#A6A19A', marginTop: '0.2rem' }}>
                              Nota: {cartItem.notes}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button 
                            onClick={() => updateCartQuantity(cartItem.item, cartItem.notes, cartItem.quantity - 1)}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', padding: 0 }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '0.95rem' }}>{cartItem.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(cartItem.item, cartItem.notes, cartItem.quantity + 1)}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', padding: 0 }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección 2: Comandas en Cocina */}
              {session?.orders?.length > 0 && (
                <div style={{ borderTop: cart.length > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingTop: cart.length > 0 ? '1.5rem' : '0' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#8E9B77', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                    Enviado a Cocina
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {session.orders.map((order, orderIdx) => (
                      <div key={order.id} style={{ borderBottom: orderIdx < session.orders.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none', paddingBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#A6A19A', marginBottom: '0.5rem' }}>
                          <span>Pedido #{orderIdx + 1}</span>
                          <span style={{ 
                            color: order.status === 'pending_confirm' ? '#D9A05B' : '#8E9B77',
                            fontWeight: 600
                          }}>
                            {order.status === 'pending_confirm' ? 'Pte Confirmación' : 'Marchando'}
                          </span>
                        </div>
                        {order.items.map((item, itemIdx) => (
                          <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#FAF7F2' }}>{item.quantity}x {item.name}</span>
                            <span style={{ color: '#A6A19A' }}>{(item.price * item.quantity).toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal con Totales y Envío */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#131313' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#A6A19A', fontSize: '0.9rem' }}>En preparación:</span>
                <span style={{ color: '#FAF7F2', fontSize: '0.9rem' }}>{cartSubtotal.toFixed(2)}€</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: '#A6A19A', fontSize: '0.9rem' }}>Enviado a cocina:</span>
                <span style={{ color: '#FAF7F2', fontSize: '0.9rem' }}>{confirmedSubtotal.toFixed(2)}€</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ fontSize: '1.1rem', color: '#FAF7F2' }}>Total Cuenta:</strong>
                <strong style={{ fontSize: '1.2rem', color: '#C8A96E' }}>{grandTotal.toFixed(2)}€</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cart.length > 0 && (
                  <button 
                    onClick={confirmOrder}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.9rem' }}
                  >
                    <ShoppingBag size={18} />
                    Confirmar y Pedir a Cocina
                  </button>
                )}
                {session.status === 'cuenta_solicitada' ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '0.75rem', 
                    background: 'rgba(142, 155, 119, 0.12)', 
                    border: '1px solid #8E9B77',
                    borderRadius: '8px',
                    color: '#8E9B77',
                    fontSize: '0.85rem'
                  }}>
                    Cuenta solicitada. El camarero está en camino.
                  </div>
                ) : (
                  <button 
                    onClick={requestBill}
                    className="btn"
                    style={{ width: '100%', padding: '0.9rem', border: '1px solid rgba(200, 169, 110, 0.4)', color: '#C8A96E' }}
                  >
                    <Receipt size={18} />
                    Pedir la Cuenta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientView;
