import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Settings, 
  Utensils, 
  QrCode, 
  Upload, 
  Plus, 
  Save, 
  Trash2, 
  Eye, 
  Check, 
  AlertTriangle,
  HelpCircle,
  FileText,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

function AdminView() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState('al-punto-rivas');

  // Datos del Restaurante seleccionado
  const [restaurant, setRestaurant] = useState({
    name: '', assistant_name: '', assistant_personality: '', welcome_message: '', location: '', specialties: '', restrictions: ''
  });
  const [branding, setBranding] = useState({
    logo_url: '', hero_image_url: '', primary_color: '#C8A96E', secondary_color: '#0D0D0D'
  });

  const [tables, setTables] = useState([]);
  const [newTableName, setNewTableName] = useState('');
  const [newTableZone, setNewTableZone] = useState('interior');
  const [newTableSeasonal, setNewTableSeasonal] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '', category: 'Entrantes', description: '', price: '', price_type: 'por ración', allergens: '', available: true, notes: ''
  });

  // Estado del Importador de Carta por PDF/Imagen
  const [pdfText, setPdfText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsedItems, setParsedItems] = useState([]); // [{ name, price, category... status: 'correcto' | 'con_dudas' }]

  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'tables' | 'menu' | 'pdf'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, [selectedRestId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Obtener lista de restaurantes
      const { data: rests } = await supabase.from('restaurants').select('*');
      if (rests) setRestaurants(rests);

      // Cargar datos del restaurante activo
      const { data: rest } = await supabase.from('restaurants').select('*').eq('restaurant_id', selectedRestId).single();
      if (rest) setRestaurant(rest);

      const { data: brand } = await supabase.from('restaurant_branding').select('*').eq('restaurant_id', selectedRestId).single();
      if (brand) setBranding(brand);

      // Cargar mesas
      const { data: tbls } = await supabase.from('tables').select('*').eq('restaurant_id', selectedRestId);
      if (tbls) setTables(tbls);

      // Cargar platos
      const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', selectedRestId);
      if (items) setMenuItems(items);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Guardar Branding y Configuración
  const handleSaveBranding = async () => {
    try {
      const { error: rErr } = await supabase
        .from('restaurants')
        .update(restaurant)
        .eq('restaurant_id', selectedRestId);

      const { error: bErr } = await supabase
        .from('restaurant_branding')
        .update(branding)
        .eq('restaurant_id', selectedRestId);

      if (rErr || bErr) throw new Error("Error al guardar configuraciones.");
      alert("¡Configuración guardada correctamente!");
    } catch (err) {
      alert(err.message);
    }
  };

  // 2. Gestión de Mesas
  const handleAddTable = async () => {
    if (!newTableName.trim()) return;
    const table_id = `table-${selectedRestId}-${newTableName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    try {
      const { error } = await supabase.from('tables').insert({
        table_id,
        restaurant_id: selectedRestId,
        name: newTableName,
        zone: newTableZone,
        seasonal: newTableSeasonal,
        status: 'active'
      });

      if (error) throw error;
      setNewTableName('');
      loadInitialData();
    } catch (err) {
      alert("Error al añadir mesa: " + err.message);
    }
  };

  const handleToggleSeasonal = async (tableItem) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ seasonal: !tableItem.seasonal })
        .eq('table_id', tableItem.table_id);
      if (error) throw error;
      loadInitialData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta mesa?")) return;
    try {
      const { error } = await supabase.from('tables').delete().eq('table_id', tableId);
      if (error) throw error;
      loadInitialData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. Gestión de Carta (Manual CRUD)
  const handleAddMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price) return;
    
    try {
      const allergensArr = newItem.allergens
        ? newItem.allergens.split(',').map(a => a.trim().toLowerCase())
        : [];

      const { error } = await supabase.from('menu_items').insert({
        restaurant_id: selectedRestId,
        category: newItem.category,
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        price_type: newItem.price_type,
        allergens: allergensArr,
        available: newItem.available,
        notes: newItem.notes,
        source: 'manual'
      });

      if (error) throw error;
      setNewItem({
        name: '', category: 'Entrantes', description: '', price: '', price_type: 'por ración', allergens: '', available: true, notes: ''
      });
      loadInitialData();
    } catch (err) {
      alert("Error al añadir plato: " + err.message);
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ available: !item.available })
        .eq('id', item.id);
      if (error) throw error;
      loadInitialData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm("¿Deseas eliminar este plato?")) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
      loadInitialData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 4. Importador por PDF / OCR Claude
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunParser = async () => {
    if (!pdfText.trim() && !imagePreview) {
      alert("Introduce texto o sube una imagen de la carta.");
      return;
    }

    setImporting(true);
    try {
      let body = {};
      if (imagePreview) {
        // Remover el prefijo de base64 dataurl (ej: "data:image/jpeg;base64,")
        const base64Data = imagePreview.split(',')[1];
        const mimeType = imagePreview.split(',')[0].split(':')[1].split(';')[0];
        body = { image: base64Data, image_type: mimeType };
      } else {
        body = { text: pdfText };
      }

      const res = await fetch('/api/pdf-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Fallo en la comunicación con el analizador de Claude.");

      const data = await res.json();
      
      // Mapear platos recibidos asignando un estado inicial de revisión
      if (data.menu_items) {
        const itemsWithStatus = data.menu_items.map(item => {
          // Si el plato tiene nombre y precio correctos, lo clasificamos como 'correcto'.
          // Si le falta precio o descripción, lo clasificamos como 'con_dudas'.
          let status = 'correcto';
          if (!item.price || item.price <= 0 || !item.category) {
            status = 'con_dudas';
          }
          return { ...item, status };
        });
        setParsedItems(itemsWithStatus);
      } else {
        alert("Claude no detectó platos legibles. Por favor, asegúrate del texto/imagen.");
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleUpdateParsedItem = (index, field, value) => {
    setParsedItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveParsedItems = async () => {
    if (parsedItems.length === 0) return;

    try {
      const itemsToInsert = parsedItems.map(item => ({
        restaurant_id: selectedRestId,
        category: item.category || 'Otros',
        name: item.name,
        description: item.description,
        price: parseFloat(item.price) || 0,
        price_type: item.price_type || 'por ración',
        allergens: Array.isArray(item.allergens) ? item.allergens : [],
        available: true,
        notes: item.notes,
        source: 'pdf_import'
      }));

      const { error } = await supabase.from('menu_items').insert(itemsToInsert);
      if (error) throw error;

      alert(`¡Se han importado ${itemsToInsert.length} platos con éxito!`);
      setParsedItems([]);
      setPdfText('');
      setImageFile(null);
      setImagePreview('');
      loadInitialData();
    } catch (err) {
      alert("Error al guardar platos importados: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem', color: '#C8A96E' }}>Cargando Panel de Administración...</div>
      </div>
    );
  }

  // Generador de URL de QR
  const getQrUrl = (tableId) => {
    // URL del cliente local. En producción sería la URL real.
    const baseUrl = `${window.location.origin}/mesa`;
    const targetUrl = `${baseUrl}?r=${selectedRestId}&t=${tableId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}`;
  };

  return (
    <div className="dashboard-layout theme-dark">
      {/* Sidebar */}
      <div className="sidebar">
        <h2 style={{ fontFamily: 'var(--font-serif)', color: '#C8A96E', fontSize: '1.5rem', marginBottom: '1rem' }}>
          Configuración
        </h2>

        {/* Selector de Restaurante (Multi-tenant demo) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#A6A19A', display: 'block', marginBottom: '0.5rem' }}>Restaurante Tenant:</label>
          <select 
            value={selectedRestId} 
            onChange={(e) => setSelectedRestId(e.target.value)}
            style={{ 
              width: '100%', 
              background: '#0D0D0D', 
              border: '1px solid rgba(200,169,110,0.3)', 
              color: '#FAF7F2', 
              padding: '0.5rem',
              borderRadius: '6px'
            }}
          >
            {restaurants.map(r => (
              <option key={r.restaurant_id} value={r.restaurant_id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Links del Menú Lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('branding')}
            className={`btn ${activeTab === 'branding' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%', border: 'none' }}
          >
            <Settings size={16} />
            Identidad y Marca
          </button>
          <button 
            onClick={() => setActiveTab('tables')}
            className={`btn ${activeTab === 'tables' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%', border: 'none' }}
          >
            <QrCode size={16} />
            Gestión de Mesas
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`btn ${activeTab === 'menu' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%', border: 'none' }}
          >
            <Utensils size={16} />
            Carta de Platos
          </button>
          <button 
            onClick={() => setActiveTab('pdf')}
            className={`btn ${activeTab === 'pdf' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%', border: 'none' }}
          >
            <Upload size={16} />
            Importar PDF (IA)
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        
        {/* ====================================================
            TAB: BRANDING
            ==================================================== */}
        {activeTab === 'branding' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Identidad del Asistente y Colores de Marca</h2>
            
            <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
              {/* Formulario */}
              <div className="surface card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#C8A96E', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Ajustes del Camarero Virtual</h3>
                
                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Nombre del Asistente:</label>
                  <input 
                    type="text" 
                    className="chat-input" 
                    value={restaurant.assistant_name}
                    onChange={(e) => setRestaurant({ ...restaurant, assistant_name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Personalidad del Asistente (Prompt):</label>
                  <textarea 
                    className="chat-input" 
                    rows={4} 
                    style={{ resize: 'vertical' }}
                    value={restaurant.assistant_personality}
                    onChange={(e) => setRestaurant({ ...restaurant, assistant_personality: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Mensaje de Bienvenida:</label>
                  <input 
                    type="text" 
                    className="chat-input" 
                    value={restaurant.welcome_message}
                    onChange={(e) => setRestaurant({ ...restaurant, welcome_message: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Restricciones Especiales / Indicaciones:</label>
                  <textarea 
                    className="chat-input" 
                    rows={3} 
                    style={{ resize: 'vertical' }}
                    value={restaurant.restrictions || ''}
                    onChange={(e) => setRestaurant({ ...restaurant, restrictions: e.target.value })}
                    placeholder="Ej. Recomienda el vino de la casa si piden carne..."
                  />
                </div>
              </div>

              {/* Branding Visual */}
              <div className="surface card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#C8A96E', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Personalización Visual</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Color Principal (Acento):</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={branding.primary_color} 
                        onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                        style={{ width: '40px', height: '40px', border: 'none', background: 'transparent' }}
                      />
                      <input 
                        type="text" 
                        className="chat-input" 
                        value={branding.primary_color}
                        onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                        style={{ padding: '0.25rem 0.5rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Color Secundario (Fondo):</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={branding.secondary_color} 
                        onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                        style={{ width: '40px', height: '40px', border: 'none', background: 'transparent' }}
                      />
                      <input 
                        type="text" 
                        className="chat-input" 
                        value={branding.secondary_color}
                        onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                        style={{ padding: '0.25rem 0.5rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>URL del Logo (Máx 2MB):</label>
                  <input 
                    type="text" 
                    className="chat-input" 
                    value={branding.logo_url || ''}
                    onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>URL de Foto de Portada (Hero):</label>
                  <input 
                    type="text" 
                    className="chat-input" 
                    value={branding.hero_image_url || ''}
                    onChange={(e) => setBranding({ ...branding, hero_image_url: e.target.value })}
                  />
                </div>

                {/* Live Preview Box */}
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  background: '#0D0D0D', 
                  border: `1.5px solid ${branding.primary_color}`, 
                  textAlign: 'center' 
                }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#A6A19A', display: 'block', marginBottom: '0.5rem' }}>
                    Vista Previa en Vivo
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: branding.primary_color }} />
                    <span style={{ color: '#FAF7F2', fontWeight: 600 }}>Botones e indicaciones brillarán con este acento dorado.</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveBranding} className="btn btn-primary" style={{ padding: '0.9rem 2rem' }}>
                <Save size={18} />
                Guardar Configuración
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: TABLES
            ==================================================== */}
        {activeTab === 'tables' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Gestión de Mesas y Descarga de Códigos QR</h2>
            
            <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
              {/* Formulario Añadir Mesa */}
              <div className="surface card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#C8A96E', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Crear Nueva Mesa</h3>
                
                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Nombre / Número de Mesa:</label>
                  <input 
                    type="text" 
                    className="chat-input"
                    placeholder="Ej. Mesa 4, Mesa Terraza 2"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Zona:</label>
                  <select 
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value)}
                    style={{ 
                      width: '100%', 
                      background: '#0D0D0D', 
                      border: '1px solid rgba(255,255,255,0.15)', 
                      color: '#FAF7F2', 
                      padding: '0.75rem',
                      borderRadius: '12px'
                    }}
                  >
                    <option value="interior">Interior (Salón)</option>
                    <option value="terraza">Terraza</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="seasonal"
                    checked={newTableSeasonal}
                    onChange={(e) => setNewTableSeasonal(e.target.checked)}
                  />
                  <label htmlFor="seasonal" style={{ fontSize: '0.85rem' }}>Mesa de temporada (desactivable)</label>
                </div>

                <button onClick={handleAddTable} className="btn btn-primary" style={{ width: '100%' }}>
                  <Plus size={16} />
                  Crear Mesa
                </button>
              </div>

              {/* Listado de Mesas y QRs */}
              <div className="grid grid-cols-2" style={{ gridColumn: 'span 2', gap: '1rem' }}>
                {tables.map(tbl => (
                  <div key={tbl.table_id} className="surface card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: '#FAF7F2', padding: '0.5rem', borderRadius: '8px' }}>
                      <img 
                        src={getQrUrl(tbl.table_id)} 
                        alt="QR Code" 
                        style={{ width: '80px', height: '80px', display: 'block' }}
                      />
                    </div>
                    
                    <div style={{ flexGrow: 1 }}>
                      <h4 style={{ fontSize: '1.1rem', color: '#FAF7F2' }}>{tbl.name}</h4>
                      <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                        Zona: {tbl.zone === 'interior' ? 'Salón Interior' : 'Terraza'}
                      </p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button 
                          onClick={() => handleToggleSeasonal(tbl)}
                          style={{ border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: tbl.seasonal ? '#D9A05B' : '#A6A19A' }}
                        >
                          {tbl.seasonal ? <ToggleRight size={18} className="text-warning" /> : <ToggleLeft size={18} />}
                          Temporal
                        </button>
                        
                        <a 
                          href={getQrUrl(tbl.table_id)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: '#C8A96E', textDecoration: 'none' }}
                        >
                          Descargar QR
                        </a>

                        <button 
                          onClick={() => handleDeleteTable(tbl.table_id)}
                          style={{ border: 'none', background: 'transparent', padding: 0, marginLeft: 'auto', color: '#C07070' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: MENU CRUD
            ==================================================== */}
        {activeTab === 'menu' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Gestión de la Carta de Platos</h2>
            
            <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
              {/* Formulario Crear Plato */}
              <div className="surface card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#C8A96E', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Añadir Plato</h3>
                
                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Nombre del Plato:</label>
                  <input 
                    type="text" 
                    className="chat-input"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Categoría:</label>
                    <select 
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      style={{ width: '100%', background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.15)', color: '#FAF7F2', padding: '0.5rem', borderRadius: '6px' }}
                    >
                      <option value="Entrantes">Entrantes</option>
                      <option value="Arroces">Arroces</option>
                      <option value="Carnes">Carnes</option>
                      <option value="Asados">Asados</option>
                      <option value="Postres">Postres</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Precio (€):</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="chat-input"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Forma de Cobro:</label>
                  <input 
                    type="text" 
                    className="chat-input"
                    placeholder="por ración, por unidad, mínimo 2 personas..."
                    value={newItem.price_type}
                    onChange={(e) => setNewItem({ ...newItem, price_type: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Descripción:</label>
                  <textarea 
                    className="chat-input" 
                    rows={2}
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Alérgenos (separados por coma):</label>
                  <input 
                    type="text" 
                    className="chat-input"
                    placeholder="gluten, lacteos, marisco..."
                    value={newItem.allergens}
                    onChange={(e) => setNewItem({ ...newItem, allergens: e.target.value })}
                  />
                </div>

                <button onClick={handleAddMenuItem} className="btn btn-primary" style={{ width: '100%' }}>
                  <Plus size={16} />
                  Añadir Plato
                </button>
              </div>

              {/* Listado de Platos Existentes */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '600px' }}>
                  {menuItems.map(item => (
                    <div key={item.id} className="surface card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#FAF7F2' }}>{item.name}</strong>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            background: 'rgba(200, 169, 110, 0.1)', 
                            color: '#C8A96E', 
                            padding: '0.15rem 0.5rem', 
                            borderRadius: '10px' 
                          }}>
                            {item.category}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#A6A19A' }}>
                            {item.source === 'pdf_import' ? '📄 Importado' : '✍️ Manual'}
                          </span>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{item.description || 'Sin descripción.'}</p>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          {item.allergens?.map(alg => (
                            <span key={alg} style={{ fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                              {alg}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginLeft: '2rem' }}>
                        <span style={{ color: '#C8A96E', fontWeight: 600, fontFamily: 'var(--font-serif)', fontSize: '1.1rem' }}>
                          {item.price}€
                        </span>

                        <button 
                          onClick={() => handleToggleAvailable(item)}
                          className="btn"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: item.available ? '#8E9B77' : '#C07070', color: item.available ? '#8E9B77' : '#C07070' }}
                        >
                          {item.available ? 'Disponible' : 'Agotado'}
                        </button>

                        <button 
                          onClick={() => handleDeleteMenuItem(item.id)}
                          style={{ border: 'none', background: 'transparent', color: '#C07070' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: PDF/VISION PARSER WIZARD
            ==================================================== */}
        {activeTab === 'pdf' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Importador de Carta Inteligente (Claude OCR)</h2>
            <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '800px' }}>
              Sube una imagen o copia el texto de tu carta física. Claude procesará y estructurará automáticamente los platos, categorizándolos y detectando alérgenos y precios.
            </p>

            <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
              
              {/* Formulario Entrada Analizador */}
              <div className="surface card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#C8A96E', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Subir Menú</h3>
                
                {/* Entrada de Imagen */}
                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Subir Imagen de Carta (JPG/PNG - Máx 5MB):</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                  {imagePreview && (
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.75rem' }} 
                    />
                  )}
                </div>

                <div style={{ textAlign: 'center', color: '#A6A19A', fontSize: '0.8rem' }}>— O COPIAR TEXTO —</div>

                {/* Entrada de Texto */}
                <div>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Pegar texto extraído del PDF:</label>
                  <textarea 
                    className="chat-input" 
                    rows={6}
                    value={pdfText}
                    onChange={(e) => setPdfText(e.target.value)}
                    placeholder="Pega aquí el texto copiado de la carta..."
                    disabled={!!imagePreview}
                  />
                </div>

                <button 
                  onClick={handleRunParser} 
                  disabled={importing || (!pdfText.trim() && !imagePreview)}
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                >
                  <FileText size={16} />
                  {importing ? 'Analizando con Claude...' : 'Analizar Carta'}
                </button>
              </div>

              {/* Resultados de la Carta Parseada */}
              <div style={{ gridColumn: 'span 2' }}>
                {parsedItems.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.25rem', color: '#FAF7F2' }}>
                        Platos Extraídos ({parsedItems.length})
                      </h3>
                      <button onClick={handleSaveParsedItems} className="btn btn-primary">
                        <Check size={16} />
                        Confirmar e Importar a Carta
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '550px' }}>
                      {parsedItems.map((item, index) => (
                        <div 
                          key={index} 
                          className="surface card" 
                          style={{ 
                            padding: '1rem', 
                            border: item.status === 'correcto' ? '1px solid rgba(142, 155, 119, 0.3)' : '1px solid rgba(219, 160, 91, 0.4)' 
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                            {/* Estado y Nombre */}
                            <div style={{ flexGrow: 1 }}>
                              <input 
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateParsedItem(index, 'name', e.target.value)}
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  borderBottom: '1px dashed rgba(255,255,255,0.2)', 
                                  color: '#FAF7F2', 
                                  fontWeight: 600, 
                                  fontSize: '1rem',
                                  width: '100%',
                                  padding: '0.2rem 0'
                                }}
                              />
                            </div>
                            
                            {/* Estado de validación */}
                            <span style={{ 
                              fontSize: '0.75rem', 
                              background: item.status === 'correcto' ? 'rgba(142, 155, 119, 0.12)' : 'rgba(219, 160, 91, 0.12)', 
                              color: item.status === 'correcto' ? '#8E9B77' : '#D9A05B',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              {item.status === 'correcto' ? <Check size={12} /> : <AlertTriangle size={12} />}
                              {item.status === 'correcto' ? 'Correcto' : 'Con dudas'}
                            </span>
                          </div>

                          {/* Campos Editables */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: '#A6A19A' }}>Categoría:</label>
                              <input 
                                type="text" 
                                value={item.category || ''}
                                onChange={(e) => handleUpdateParsedItem(index, 'category', e.target.value)}
                                className="chat-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: '#A6A19A' }}>Precio (€):</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={item.price || ''}
                                onChange={(e) => handleUpdateParsedItem(index, 'price', e.target.value)}
                                className="chat-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', color: '#A6A19A' }}>Tipo Cobro:</label>
                              <input 
                                type="text" 
                                value={item.price_type || ''}
                                onChange={(e) => handleUpdateParsedItem(index, 'price_type', e.target.value)}
                                className="chat-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#A6A19A' }}>Descripción:</label>
                            <input 
                              type="text" 
                              value={item.description || ''}
                              onChange={(e) => handleUpdateParsedItem(index, 'description', e.target.value)}
                              className="chat-input"
                              style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    border: '2px dashed rgba(255,255,255,0.1)', 
                    borderRadius: '12px', 
                    padding: '4rem 2rem', 
                    textAlign: 'center', 
                    color: '#A6A19A',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <FileText size={48} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    <h4>Esperando análisis...</h4>
                    <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
                      Sube la foto del menú o copia el texto de tu PDF en la columna de la izquierda para comenzar.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminView;
