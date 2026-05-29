import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Settings, Utensils, QrCode, Upload, Plus, Save, Trash2, Eye, Check, FileText, ToggleLeft, ToggleRight, Edit, X, LogOut, Image } from 'lucide-react';

function AdminView() {
  const user = JSON.parse(localStorage.getItem('cv_user') || 'null');
  const [selectedRestId, setSelectedRestId] = useState(user?.restaurant_id || 'al-punto-rivas');
  const [restaurants, setRestaurants] = useState([]);
  const [restaurant, setRestaurant] = useState({ name: '', assistant_name: '', assistant_personality: '', welcome_message: '', location: '', specialties: '', restrictions: '' });
  const [branding, setBranding] = useState({ logo_url: '', hero_image_url: '', primary_color: '#C8A96E', secondary_color: '#0D0D0D' });
  const [tables, setTables] = useState([]);
  const [newTableName, setNewTableName] = useState('');
  const [newTableZone, setNewTableZone] = useState('interior');
  const [newTableSeasonal, setNewTableSeasonal] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', category: 'Entrantes', description: '', price: '', price_type: 'por ración', allergens: '', available: true, notes: '' });
  const [editItem, setEditItem] = useState(null);
  const [pdfText, setPdfText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [msg, setMsg] = useState('');
  const logoInputRef = useRef(null);
  const heroInputRef = useRef(null);

  useEffect(() => { loadAll(); }, [selectedRestId]);

  const loadAll = async () => {
    setLoading(true);
    const { data: rests } = await supabase.from('restaurants').select('restaurant_id, name');
    if (rests) setRestaurants(rests);
    const { data: rest } = await supabase.from('restaurants').select('*').eq('restaurant_id', selectedRestId).single();
    if (rest) setRestaurant(rest);
    const { data: brand } = await supabase.from('restaurant_branding').select('*').eq('restaurant_id', selectedRestId).single();
    if (brand) setBranding(brand);
    const { data: tbls } = await supabase.from('tables').select('*').eq('restaurant_id', selectedRestId).order('name');
    if (tbls) setTables(tbls);
    const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', selectedRestId).order('category').order('name');
    if (items) setMenuItems(items);
    setLoading(false);
  };

  const showMsg = (m, isError = false) => { setMsg({ text: m, error: isError }); setTimeout(() => setMsg(''), 3500); };

  // Upload via función serverless (usa service_role en el servidor)
  const uploadImageViaServer = async (file, name, setUploading) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      return await new Promise((resolve, reject) => {
        reader.onload = async (ev) => {
          const base64 = ev.target.result.split(',')[1];
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, fileName: name, mimeType: file.type, restaurantId: selectedRestId })
          });
          const data = await res.json();
          if (data.error) reject(new Error(data.error));
          else resolve(data.url);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImageViaServer(file, 'logo', setUploadingLogo);
      setBranding(b => ({ ...b, logo_url: url }));
      showMsg('Logo subido ✓');
    } catch(err) { showMsg('Error al subir logo: ' + err.message, true); }
  };

  const handleHeroUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImageViaServer(file, 'hero', setUploadingHero);
      setBranding(b => ({ ...b, hero_image_url: url }));
      showMsg('Foto de portada subida ✓');
    } catch(err) { showMsg('Error al subir portada: ' + err.message, true); }
  };

  const saveBranding = async () => {
    setSaving(true);
    await supabase.from('restaurants').update(restaurant).eq('restaurant_id', selectedRestId);
    const { error } = await supabase.from('restaurant_branding').upsert({ ...branding, restaurant_id: selectedRestId });
    setSaving(false);
    showMsg(error ? 'Error al guardar' : 'Guardado ✓', !!error);
  };

  const addTable = async () => {
    if (!newTableName.trim()) return;
    const tableId = `${selectedRestId}-${newTableName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const { error } = await supabase.from('tables').insert({ table_id: tableId, restaurant_id: selectedRestId, name: newTableName, zone: newTableZone, status: 'active', seasonal: newTableSeasonal });
    if (!error) { setNewTableName(''); loadAll(); showMsg('Mesa añadida ✓'); }
  };

  const deleteTable = async (tableId) => {
    if (!confirm('¿Eliminar esta mesa?')) return;
    await supabase.from('tables').delete().eq('table_id', tableId);
    loadAll();
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price) { showMsg('Nombre y precio son obligatorios', true); return; }
    const allergensList = newItem.allergens ? newItem.allergens.split(',').map(a => a.trim().toLowerCase()).filter(Boolean) : [];
    const { error } = await supabase.from('menu_items').insert({ ...newItem, restaurant_id: selectedRestId, price: parseFloat(newItem.price), allergens: allergensList, source: 'manual' });
    if (!error) { setNewItem({ name: '', category: 'Entrantes', description: '', price: '', price_type: 'por ración', allergens: '', available: true, notes: '' }); loadAll(); showMsg('Plato añadido ✓'); }
    else showMsg('Error al añadir plato', true);
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    const allergensList = typeof editItem.allergens === 'string'
      ? editItem.allergens.split(',').map(a => a.trim().toLowerCase()).filter(Boolean)
      : editItem.allergens || [];
    const { error } = await supabase.from('menu_items').update({ ...editItem, price: parseFloat(editItem.price), allergens: allergensList }).eq('id', editItem.id);
    if (!error) { setEditItem(null); loadAll(); showMsg('Plato actualizado ✓'); }
    else showMsg('Error al guardar', true);
  };

  const deleteMenuItem = async (id) => {
    if (!confirm('¿Eliminar este plato?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    loadAll();
  };

  const toggleAvailable = async (item) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id);
    loadAll();
  };

  const getQrImageUrl = (tableId) => {
    const targetUrl = `${window.location.origin}/mesa?r=${selectedRestId}&t=${tableId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;
  };

  const getTableUrl = (tableId) => `${window.location.origin}/mesa?r=${selectedRestId}&t=${tableId}`;

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const importFromPdf = async () => {
    if (!pdfText.trim() && !imagePreview) return;
    setImporting(true); setParsedItems([]);
    try {
      let body;
      if (imagePreview && imageFile) {
        body = { image: imagePreview.split(',')[1], image_type: imageFile.type };
      } else {
        body = { text: pdfText };
      }
      const res = await fetch('/api/pdf-parser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Error HTTP ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsedItems((data.menu_items || []).map(item => ({ ...item, selected: true })));
    } catch(err) { showMsg('Error al analizar: ' + err.message, true); }
    finally { setImporting(false); }
  };

  const importSelectedItems = async () => {
    const toImport = parsedItems.filter(i => i.selected);
    if (!toImport.length) return;
    for (const item of toImport) {
      await supabase.from('menu_items').insert({ restaurant_id: selectedRestId, category: item.category || 'General', name: item.name, description: item.description, price: parseFloat(item.price) || 0, price_type: item.price_type || 'por ración', allergens: item.allergens || [], available: true, notes: item.notes, source: 'pdf_import' });
    }
    showMsg(`${toImport.length} platos importados ✓`);
    setParsedItems([]); setPdfText(''); setImagePreview(''); loadAll();
  };

  const logout = () => { localStorage.removeItem('cv_user'); window.location.href = '/auth'; };
  const categories = ['Entrantes', 'Arroces', 'Carnes', 'Pescados', 'Postres', 'Bebidas', 'Menú del Día', 'Asados', 'General'];
  const menuByCategory = menuItems.reduce((acc, item) => { if (!acc[item.category]) acc[item.category] = []; acc[item.category].push(item); return acc; }, {});

  if (loading) return <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', color:'#C8A96E', fontFamily:'Inter,sans-serif' }}>Cargando...</div>;

  return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', fontFamily:'Inter,sans-serif', color:'#FAF7F2' }}>
      {/* Header responsive */}
      <header style={{ background:'#1A1A1A', borderBottom:'1px solid rgba(200,169,110,0.15)', padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', color:'#C8A96E', fontSize:'clamp(1.1rem,3vw,1.4rem)', margin:0 }}>Panel de Administración</h1>
          <p style={{ color:'#A6A19A', fontSize:'0.8rem', margin:0 }}>{user?.email} — {selectedRestId}</p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
          {restaurants.length > 1 && (
            <select value={selectedRestId} onChange={e => setSelectedRestId(e.target.value)} style={{ background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.1)', color:'#FAF7F2', padding:'0.4rem 0.75rem', borderRadius:'6px', fontSize:'0.85rem' }}>
              {restaurants.map(r => <option key={r.restaurant_id} value={r.restaurant_id}>{r.name}</option>)}
            </select>
          )}
          <a href="/caja" style={{ padding:'0.5rem 1rem', background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', textDecoration:'none', fontSize:'0.85rem' }}>Caja</a>
          <button onClick={logout} style={{ padding:'0.5rem 0.75rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#A6A19A', cursor:'pointer', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
            <LogOut size={13}/> Salir
          </button>
        </div>
      </header>

      {msg && <div style={{ padding:'0.75rem 1.5rem', background: msg.error ? 'rgba(192,112,112,0.15)' : 'rgba(142,155,119,0.15)', color: msg.error ? '#C07070' : '#8E9B77', fontSize:'0.9rem', textAlign:'center' }}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{ background:'#1A1A1A', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 1rem', display:'flex', gap:'0', overflowX:'auto' }}>
        {[['branding','⚙️ Config'],['tables','📍 Mesas'],['menu','🍽️ Carta'],['pdf','📄 PDF']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding:'0.875rem 1rem', background:'none', border:'none', borderBottom: activeTab===tab ? '2px solid #C8A96E' : '2px solid transparent', color: activeTab===tab ? '#C8A96E' : '#A6A19A', cursor:'pointer', fontWeight: activeTab===tab ? 600 : 400, fontSize:'0.85rem', whiteSpace:'nowrap' }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:'1.25rem', maxWidth:'1200px', margin:'0 auto' }}>

        {/* TAB: CONFIGURACIÓN */}
        {activeTab === 'branding' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.5rem' }}>
            {/* Identidad */}
            <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.5rem' }}>
              <h2 style={{ color:'#C8A96E', fontSize:'1.05rem', marginBottom:'1.25rem', marginTop:0 }}>Identidad y Marca</h2>
              
              {/* Logo con UPLOAD */}
              <div style={{ marginBottom:'1.25rem' }}>
                <label style={lblSt}>Logo del Restaurante</label>
                {branding.logo_url && <img src={branding.logo_url} alt="logo" style={{ height:'60px', objectFit:'contain', marginBottom:'0.5rem', borderRadius:'4px', background:'rgba(255,255,255,0.05)', padding:'4px', display:'block' }} />}
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  <input value={branding.logo_url || ''} onChange={e => setBranding({...branding, logo_url: e.target.value})} placeholder="URL o sube un archivo..." style={{...inputSt, flex:1}} />
                  <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                    style={{ padding:'0.5rem 0.75rem', background:'rgba(200,169,110,0.15)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', cursor:'pointer', fontSize:'0.8rem', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                    <Image size={14}/> {uploadingLogo ? '...' : 'Subir'}
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}} />
                </div>
              </div>

              {/* Foto portada con UPLOAD */}
              <div style={{ marginBottom:'1.25rem' }}>
                <label style={lblSt}>Foto de Portada</label>
                {branding.hero_image_url && <img src={branding.hero_image_url} alt="hero" style={{ width:'100%', height:'90px', objectFit:'cover', marginBottom:'0.5rem', borderRadius:'6px', display:'block' }} />}
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  <input value={branding.hero_image_url || ''} onChange={e => setBranding({...branding, hero_image_url: e.target.value})} placeholder="URL o sube una imagen..." style={{...inputSt, flex:1}} />
                  <button onClick={() => heroInputRef.current?.click()} disabled={uploadingHero}
                    style={{ padding:'0.5rem 0.75rem', background:'rgba(200,169,110,0.15)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', cursor:'pointer', fontSize:'0.8rem', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                    <Upload size={14}/> {uploadingHero ? '...' : 'Subir'}
                  </button>
                  <input ref={heroInputRef} type="file" accept="image/*" onChange={handleHeroUpload} style={{display:'none'}} />
                </div>
              </div>

              {/* Colores */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                {[['primary_color','Color Principal'],['secondary_color','Color Fondo']].map(([field, label]) => (
                  <div key={field}>
                    <label style={lblSt}>{label}</label>
                    <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
                      <input type="color" value={branding[field] || '#000000'} onChange={e => setBranding({...branding, [field]: e.target.value})} style={{ width:'36px', height:'34px', border:'none', borderRadius:'4px', cursor:'pointer', background:'none', padding:0 }}/>
                      <input value={branding[field] || ''} onChange={e => setBranding({...branding, [field]: e.target.value})} style={{...inputSt, flex:1}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Datos del restaurante */}
            <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.5rem' }}>
              <h2 style={{ color:'#C8A96E', fontSize:'1.05rem', marginBottom:'1.25rem', marginTop:0 }}>Datos del Restaurante</h2>
              {[['name','Nombre'],['location','Ubicación'],['assistant_name','Nombre del Asistente IA']].map(([field, label]) => (
                <div key={field} style={{ marginBottom:'0.875rem' }}>
                  <label style={lblSt}>{label}</label>
                  <input value={restaurant[field]||''} onChange={e => setRestaurant({...restaurant, [field]: e.target.value})} style={inputSt}/>
                </div>
              ))}
              {[['assistant_personality','Personalidad del Asistente'],['specialties','Especialidades'],['welcome_message','Mensaje de Bienvenida'],['restrictions','Restricciones / Instrucciones extra']].map(([field, label]) => (
                <div key={field} style={{ marginBottom:'0.875rem' }}>
                  <label style={lblSt}>{label}</label>
                  <textarea value={restaurant[field]||''} onChange={e => setRestaurant({...restaurant, [field]: e.target.value})} rows={2} style={{...inputSt, resize:'vertical'}}/>
                </div>
              ))}
            </div>

            <button onClick={saveBranding} disabled={saving} style={{ gridColumn:'1/-1', padding:'0.875rem', background: saving ? '#555' : '#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'8px', fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
              <Save size={16}/> {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        )}

        {/* TAB: MESAS & QR */}
        {activeTab === 'tables' && (
          <div>
            <h2 style={{ color:'#C8A96E', fontSize:'1.2rem', marginBottom:'1.5rem', marginTop:0 }}>Gestión de Mesas y QR</h2>
            <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.5rem' }}>
              <h3 style={{ fontSize:'0.95rem', marginBottom:'1rem', marginTop:0 }}>Añadir Mesa</h3>
              <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'flex-end' }}>
                <div><label style={lblSt}>Nombre</label><input value={newTableName} onChange={e => setNewTableName(e.target.value)} placeholder="Mesa 5" style={{...inputSt, width:'140px'}} onKeyPress={e => e.key==='Enter' && addTable()}/></div>
                <div><label style={lblSt}>Zona</label><select value={newTableZone} onChange={e => setNewTableZone(e.target.value)} style={{...inputSt, width:'120px'}}><option value="interior">Interior</option><option value="terraza">Terraza</option><option value="privado">Privado</option></select></div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', paddingBottom:'2px' }}><input type="checkbox" checked={newTableSeasonal} onChange={e => setNewTableSeasonal(e.target.checked)} style={{ width:'15px', height:'15px' }}/><label style={{ fontSize:'0.85rem', color:'#A6A19A' }}>Estacional</label></div>
                <button onClick={addTable} style={{ padding:'0.6rem 1.25rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' }}><Plus size={14}/> Añadir</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'1.25rem' }}>
              {tables.map(tbl => (
                <div key={tbl.table_id} style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem', textAlign:'center' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.875rem' }}>
                    <div><div style={{ fontWeight:700 }}>{tbl.name}</div><div style={{ fontSize:'0.75rem', color:'#A6A19A' }}>{tbl.zone} {tbl.seasonal ? '• Estacional' : ''}</div></div>
                    <button onClick={() => deleteTable(tbl.table_id)} style={{ background:'none', border:'1px solid rgba(192,112,112,0.3)', borderRadius:'6px', padding:'0.3rem', cursor:'pointer', color:'#C07070' }}><Trash2 size={13}/></button>
                  </div>
                  <img src={getQrImageUrl(tbl.table_id)} alt={`QR ${tbl.name}`} style={{ width:'130px', height:'130px', borderRadius:'8px', background:'white', padding:'6px' }}/>
                  <div style={{ marginTop:'0.75rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    <a href={getQrImageUrl(tbl.table_id)} download={`QR-${tbl.name}.png`} target="_blank" rel="noreferrer"
                      style={{ padding:'0.45rem', background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', textDecoration:'none', fontSize:'0.78rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                      <QrCode size={12}/> Descargar QR
                    </a>
                    <a href={getTableUrl(tbl.table_id)} target="_blank" rel="noreferrer"
                      style={{ padding:'0.4rem', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', color:'#A6A19A', textDecoration:'none', fontSize:'0.75rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                      <Eye size={12}/> Probar enlace
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CARTA */}
        {activeTab === 'menu' && (
          <div>
            <h2 style={{ color:'#C8A96E', fontSize:'1.2rem', marginBottom:'1.5rem', marginTop:0 }}>Carta ({menuItems.length} platos)</h2>
            {/* Añadir plato */}
            <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.5rem' }}>
              <h3 style={{ fontSize:'0.95rem', marginBottom:'1rem', marginTop:0 }}>Añadir Plato</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'0.75rem' }}>
                <div><label style={lblSt}>Nombre *</label><input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Croquetas" style={inputSt}/></div>
                <div><label style={lblSt}>Categoría</label><select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} style={inputSt}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label style={lblSt}>Precio (€) *</label><input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="12.50" style={inputSt}/></div>
                <div><label style={lblSt}>Tipo precio</label><select value={newItem.price_type} onChange={e => setNewItem({...newItem, price_type: e.target.value})} style={inputSt}>{['por ración','por persona','por unidad','precio fijo'].map(t => <option key={t}>{t}</option>)}</select></div>
                <div style={{ gridColumn:'1/-1' }}><label style={lblSt}>Descripción</label><input value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Descripción..." style={inputSt}/></div>
                <div><label style={lblSt}>Alérgenos (comas)</label><input value={newItem.allergens} onChange={e => setNewItem({...newItem, allergens: e.target.value})} placeholder="gluten, lacteos" style={inputSt}/></div>
                <div><label style={lblSt}>Notas internas</label><input value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} placeholder="Notas cocina..." style={inputSt}/></div>
              </div>
              <button onClick={addMenuItem} style={{ marginTop:'1rem', padding:'0.6rem 1.5rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' }}><Plus size={14}/> Añadir Plato</button>
            </div>
            {/* Listado */}
            {Object.entries(menuByCategory).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom:'1.5rem' }}>
                <h3 style={{ color:'#C8A96E', fontSize:'0.9rem', borderBottom:'1px solid rgba(200,169,110,0.15)', paddingBottom:'0.4rem', marginBottom:'0.75rem' }}>{cat} ({items.length})</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'8px', padding:'0.75rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem', flexWrap:'wrap', opacity: item.available ? 1 : 0.5 }}>
                      <div style={{ flex:1, minWidth:'180px' }}>
                        <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{item.name}</div>
                        {item.description && <div style={{ fontSize:'0.75rem', color:'#A6A19A' }}>{item.description}</div>}
                        {item.allergens?.length > 0 && <div style={{ fontSize:'0.7rem', color:'#D9A05B' }}>⚠️ {item.allergens.join(', ')}</div>}
                      </div>
                      <div style={{ fontWeight:700, color:'#C8A96E', fontSize:'0.9rem' }}>{parseFloat(item.price).toFixed(2)}€</div>
                      <div style={{ display:'flex', gap:'0.4rem' }}>
                        <button onClick={() => setEditItem({...item, allergens: Array.isArray(item.allergens) ? item.allergens.join(', ') : item.allergens || ''})} style={iconBtnSt} title="Editar"><Edit size={13}/></button>
                        <button onClick={() => toggleAvailable(item)} style={{...iconBtnSt, color: item.available ? '#8E9B77' : '#C07070'}}>{item.available ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}</button>
                        <button onClick={() => deleteMenuItem(item.id)} style={{...iconBtnSt, color:'#C07070', borderColor:'rgba(192,112,112,0.3)'}}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: PDF */}
        {activeTab === 'pdf' && (
          <div>
            <h2 style={{ color:'#C8A96E', fontSize:'1.2rem', marginBottom:'0.5rem', marginTop:0 }}>Importar Carta desde PDF / Imagen</h2>
            <p style={{ color:'#A6A19A', fontSize:'0.88rem', marginBottom:'1.5rem' }}>Pega el texto de tu carta o sube una foto del menú. La IA extraerá todos los platos.</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.25rem', marginBottom:'1.25rem' }}>
              <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem', marginBottom:'0.875rem', marginTop:0 }}>Texto del menú</h3>
                <textarea value={pdfText} onChange={e => setPdfText(e.target.value)} rows={10} placeholder="Pega aquí el texto de tu carta..." style={{...inputSt, resize:'vertical', width:'100%', fontFamily:'monospace', fontSize:'0.82rem', boxSizing:'border-box'}}/>
              </div>
              <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem', marginBottom:'0.875rem', marginTop:0 }}>Foto del Menú</h3>
                <label style={{ display:'block', border:'2px dashed rgba(200,169,110,0.3)', borderRadius:'8px', padding:'1.5rem', textAlign:'center', cursor:'pointer', color:'#A6A19A', fontSize:'0.88rem' }}>
                  {imagePreview ? <img src={imagePreview} alt="preview" style={{ maxWidth:'100%', maxHeight:'180px', objectFit:'contain', borderRadius:'6px' }}/> : <><Upload size={28} style={{ margin:'0 auto 0.5rem', display:'block', color:'#C8A96E' }}/> Haz clic para subir foto</>}
                  <input type="file" accept="image/*" onChange={handleImageFile} style={{ display:'none' }}/>
                </label>
                {imagePreview && <button onClick={() => { setImageFile(null); setImagePreview(''); }} style={{ marginTop:'0.4rem', background:'none', border:'none', color:'#C07070', cursor:'pointer', fontSize:'0.82rem' }}>✕ Eliminar</button>}
              </div>
            </div>
            <button onClick={importFromPdf} disabled={importing || (!pdfText.trim() && !imagePreview)}
              style={{ padding:'0.875rem 2rem', background: importing ? '#555' : '#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'8px', fontWeight:700, cursor: importing ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.25rem' }}>
              {importing ? '⏳ Analizando...' : '🤖 Analizar con Claude'}
            </button>
            {parsedItems.length > 0 && (
              <div style={{ background:'#1A1A1A', border:'1px solid rgba(200,169,110,0.2)', borderRadius:'12px', padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                  <h3 style={{ margin:0, fontSize:'1rem' }}>Detectados: {parsedItems.length} platos</h3>
                  <button onClick={importSelectedItems} style={{ padding:'0.6rem 1.25rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' }}><Check size={13}/> Importar seleccionados</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  {parsedItems.map((item, idx) => (
                    <div key={idx} style={{ display:'flex', alignItems:'center', gap:'0.75rem', background:'#0D0D0D', borderRadius:'6px', padding:'0.625rem 0.75rem' }}>
                      <input type="checkbox" checked={item.selected} onChange={e => setParsedItems(prev => prev.map((p,i) => i===idx ? {...p, selected: e.target.checked} : p))} style={{ width:'15px', height:'15px', flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{item.name}</div>
                        <div style={{ fontSize:'0.75rem', color:'#A6A19A' }}>{item.category} — {item.description || 'Sin descripción'}</div>
                      </div>
                      <div style={{ fontWeight:700, color:'#C8A96E' }}>{parseFloat(item.price||0).toFixed(2)}€</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal edición plato */}
      {editItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div style={{ background:'#1A1A1A', border:'1px solid rgba(200,169,110,0.2)', borderRadius:'12px', padding:'1.5rem', width:'100%', maxWidth:'480px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h3 style={{ margin:0, color:'#C8A96E' }}>Editar Plato</h3>
              <button onClick={() => setEditItem(null)} style={{ background:'none', border:'none', color:'#A6A19A', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <div><label style={lblSt}>Nombre</label><input value={editItem.name||''} onChange={e => setEditItem({...editItem, name: e.target.value})} style={inputSt}/></div>
              <div><label style={lblSt}>Descripción</label><textarea value={editItem.description||''} onChange={e => setEditItem({...editItem, description: e.target.value})} rows={2} style={{...inputSt, resize:'vertical'}}/></div>
              <div><label style={lblSt}>Categoría</label><select value={editItem.category||''} onChange={e => setEditItem({...editItem, category: e.target.value})} style={inputSt}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div><label style={lblSt}>Precio (€)</label><input type="number" step="0.01" value={editItem.price||''} onChange={e => setEditItem({...editItem, price: e.target.value})} style={inputSt}/></div>
                <div><label style={lblSt}>Tipo precio</label><select value={editItem.price_type||''} onChange={e => setEditItem({...editItem, price_type: e.target.value})} style={inputSt}>{['por ración','por persona','por unidad','precio fijo'].map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div><label style={lblSt}>Alérgenos (comas)</label><input value={typeof editItem.allergens === 'string' ? editItem.allergens : (editItem.allergens||[]).join(', ')} onChange={e => setEditItem({...editItem, allergens: e.target.value})} placeholder="gluten, lacteos" style={inputSt}/></div>
              <div><label style={lblSt}>Notas internas</label><input value={editItem.notes||''} onChange={e => setEditItem({...editItem, notes: e.target.value})} style={inputSt}/></div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <input type="checkbox" id="avail" checked={editItem.available} onChange={e => setEditItem({...editItem, available: e.target.checked})} style={{ width:'15px', height:'15px' }}/>
                <label htmlFor="avail" style={{ fontSize:'0.85rem' }}>Disponible</label>
              </div>
            </div>
            <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem' }}>
              <button onClick={() => setEditItem(null)} style={{ flex:1, padding:'0.75rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#A6A19A', cursor:'pointer' }}>Cancelar</button>
              <button onClick={saveEditItem} style={{ flex:1, padding:'0.75rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputSt = { width:'100%', padding:'0.6rem 0.75rem', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#FAF7F2', fontSize:'0.87rem', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' };
const lblSt = { display:'block', fontSize:'0.78rem', color:'#A6A19A', marginBottom:'0.3rem' };
const iconBtnSt = { background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', padding:'0.35rem', cursor:'pointer', color:'#A6A19A', display:'flex', alignItems:'center', justifyContent:'center' };

export default AdminView;
