import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Settings, Utensils, QrCode, Upload, Plus, Save, Trash2, Eye, Check, FileText, ToggleLeft, ToggleRight, Edit, X, LogOut, Image, AlertTriangle } from 'lucide-react';

function AdminView() {
  const user = JSON.parse(localStorage.getItem('cv_user') || 'null');
  // Sin desplegable — solo el restaurante del usuario logueado
  const selectedRestId = user?.restaurant_id || '';

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
  const [showClearPin, setShowClearPin] = useState(false);
  // PIN de acceso al admin
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const ADMIN_PIN = '1234';
  // Menú del día
  const [menuDia, setMenuDia] = useState({ primero:'', segundo:'', postre:'', bebida:'', precio:'', imageUrl:'' });
  const [uploadingMenuDia, setUploadingMenuDia] = useState(false);
  const [savingMenuDia, setSavingMenuDia] = useState(false);
  const [diaText, setDiaText] = useState('');
  const [diaImageFile, setDiaImageFile] = useState(null);
  const [diaImagePreview, setDiaImagePreview] = useState('');
  const [diaImporting, setDiaImporting] = useState(false);
  const [diaParsedItems, setDiaParsedItems] = useState([]);
  const [clearPin, setClearPin] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // {id, name, type: 'item'|'table'}
  const logoInputRef = useRef(null);
  const heroInputRef = useRef(null);
  const menuDiaInputRef = useRef(null);

  useEffect(() => {
    if (!selectedRestId) { window.location.href = '/auth'; return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: rest } = await supabase.from('restaurants').select('*').eq('restaurant_id', selectedRestId).single();
    if (rest) setRestaurant(rest);
    const { data: brand } = await supabase.from('restaurant_branding').select('*').eq('restaurant_id', selectedRestId).single();
    if (brand) setBranding(brand);
    const { data: tbls } = await supabase.from('tables').select('*').eq('restaurant_id', selectedRestId).order('zone').order('name');
    if (tbls) setTables(tbls);
    const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', selectedRestId).order('category').order('name');
    if (items) setMenuItems(items);
    setLoading(false);
  };

  const showMsg = (m, isError = false) => { setMsg({ text: m, error: isError }); setTimeout(() => setMsg(''), 3500); };

  // Redimensionar imagen con Canvas antes de subir
  const resizeImage = (file, maxW, maxH) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          const reader2 = new FileReader();
          reader2.onload = e => resolve(e.target.result.split(',')[1]);
          reader2.readAsDataURL(blob);
        }, 'image/jpeg', 0.88);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Upload via serverless (service_role en servidor)
  const uploadImageViaServer = async (file, name, setUploading) => {
    setUploading(true);
    try {
      const isDish = name.startsWith('dish-');
      const maxW = name === 'logo' ? 400 : isDish ? 600 : 1200;
      const maxH = name === 'logo' ? 400 : isDish ? 600 : 800;
      const base64 = await resizeImage(file, maxW, maxH);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileName: name, mimeType: 'image/jpeg', restaurantId: selectedRestId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.url;
    } finally { setUploading(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const url = await uploadImageViaServer(file, 'logo', setUploadingLogo); setBranding(b => ({ ...b, logo_url: url })); showMsg('Logo subido ✓'); }
    catch(err) { showMsg('Error: ' + err.message, true); }
  };

  const handleHeroUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const url = await uploadImageViaServer(file, 'hero', setUploadingHero); setBranding(b => ({ ...b, hero_image_url: url })); showMsg('Portada subida ✓'); }
    catch(err) { showMsg('Error: ' + err.message, true); }
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

  const deleteTable = (tableId, tableName) => {
    setConfirmDelete({ id: tableId, name: tableName, type: 'table' });
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price) { showMsg('Nombre y precio obligatorios', true); return; }
    const allergensList = newItem.allergens ? newItem.allergens.split(',').map(a => a.trim().toLowerCase()).filter(Boolean) : [];
    const { error } = await supabase.from('menu_items').insert({ ...newItem, restaurant_id: selectedRestId, price: parseFloat(newItem.price), allergens: allergensList, source: 'manual' });
    if (!error) { setNewItem({ name: '', category: 'Entrantes', description: '', price: '', price_type: 'por ración', allergens: '', available: true, notes: '' }); loadAll(); showMsg('Plato añadido ✓'); }
    else showMsg('Error al añadir: ' + error.message, true);
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    const allergensList = typeof editItem.allergens === 'string'
      ? editItem.allergens.split(',').map(a => a.trim().toLowerCase()).filter(Boolean)
      : editItem.allergens || [];
    const { error } = await supabase.from('menu_items').update({ name: editItem.name, description: editItem.description, category: editItem.category, price: parseFloat(editItem.price), price_type: editItem.price_type, allergens: allergensList, available: editItem.available, notes: editItem.notes, image_url: editItem.image_url || null }).eq('id', editItem.id);
    if (!error) { setEditItem(null); loadAll(); showMsg('Plato actualizado ✓'); }
    else showMsg('Error: ' + error.message, true);
  };

  const handleDishImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      showMsg('Subiendo imagen del plato...');
      const url = await uploadImageViaServer(file, `dish-${editItem.id}`, () => {});
      setEditItem(ei => ({ ...ei, image_url: url }));
      showMsg('Imagen subida ✓');
    } catch(err) { showMsg('Error al subir imagen: ' + err.message, true); }
  };

  const deleteMenuItem = (id, name) => {
    setConfirmDelete({ id, name, type: 'item' });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'item') {
      const { error } = await supabase.from('menu_items').delete().eq('id', confirmDelete.id);
      if (!error) { loadAll(); showMsg('Plato eliminado ✓'); }
      else showMsg('Error al borrar: ' + error.message, true);
    } else if (confirmDelete.type === 'table') {
      const { error } = await supabase.from('tables').delete().eq('table_id', confirmDelete.id);
      if (!error) { loadAll(); showMsg('Mesa eliminada ✓'); }
      else showMsg('Error al borrar mesa: ' + error.message, true);
    }
    setConfirmDelete(null);
  };

  const toggleAvailable = async (item) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id);
    loadAll();
  };

  const clearAllMenu = async () => {
    if (clearPin !== '1234') { showMsg('PIN incorrecto', true); setClearPin(''); return; }
    // Sin confirm adicional - el PIN ya es suficiente confirmación
    const { error } = await supabase.from('menu_items').delete().eq('restaurant_id', selectedRestId);
    if (!error) { loadAll(); showMsg('Carta borrada completamente'); }
    else showMsg('Error: ' + error.message, true);
    setClearPin(''); setShowClearPin(false);
  };

  const getQrImageUrl = (tableId) => {
    const targetUrl = `${window.location.origin}/mesa?r=${selectedRestId}&t=${tableId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;
  };

  const getTableUrl = (tableId) => `${window.location.origin}/mesa?r=${selectedRestId}&t=${tableId}`;

  const handleImageFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Limpia el texto de separadores de puntos/guiones antes de enviar a Claude
  const cleanMenuText = (text) => {
    return text
      .split('\n').map(line => {
        // Eliminar secuencias de 3+ puntos, guiones o espacios repetidos usados como separador
        // Ej: "Azpilicueta Crianza………….. 21€" → "Azpilicueta Crianza 21€"
        return line
          .replace(/[.·…\-–—]{3,}/g, ' ')   // 3+ puntos/guiones → espacio
          .replace(/\s{2,}/g, ' ')             // múltiples espacios → uno
          .trim();
      })
      .filter(line => line.length > 0)
      .join('\n');
  };

  // Divide texto en chunks de ~1800 chars por líneas completas
  const splitTextInChunks = (text, maxChars = 1800) => {
    const lines = text.split('\n');
    const chunks = [];
    let current = '';
    for (const line of lines) {
      if (current.length + line.length > maxChars && current.length > 0) {
        chunks.push(current.trim());
        current = '';
      }
      current += line + '\n';
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  };

  const callClaude = async (textChunk, imageData, imageType) => {
    const body = imageData ? { image: imageData, image_type: imageType } : { text: textChunk };
    const res = await fetch('/api/menu-analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      if (res.status === 504) throw new Error('Timeout del servidor. El texto es demasiado largo, divide en partes más pequeñas.');
      throw new Error('Error ' + res.status);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const handleMenuDiaImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const url = await uploadImageViaServer(file, 'menu-dia', setUploadingMenuDia); setMenuDia(m => ({ ...m, imageUrl: url })); showMsg('Foto del menú del día subida ✓'); }
    catch(err) { showMsg('Error: ' + err.message, true); }
  };

  const saveMenuDia = async () => {
    setSavingMenuDia(true);
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const hoy = dias[new Date().getDay()];
    const { error } = await supabase.from('menu_items').upsert({
      restaurant_id: selectedRestId, category: 'Menú del Día',
      name: `Menú del Día — ${hoy}`,
      description: [menuDia.primero?`1º ${menuDia.primero}`:'', menuDia.segundo?`2º ${menuDia.segundo}`:'', menuDia.postre?`Postre: ${menuDia.postre}`:'', menuDia.bebida?`Bebida: ${menuDia.bebida}`:''].filter(Boolean).join(' | '),
      price: parseFloat(menuDia.precio)||0, price_type:'por persona', allergens:[], available:true,
      image_url: menuDia.imageUrl||null, notes:`menu_dia_${hoy.toLowerCase()}`, source:'menu_dia'
    }, { onConflict:'restaurant_id,name' });
    setSavingMenuDia(false);
    if (!error) { showMsg(`Menú del día (${hoy}) guardado ✓`); loadAll(); }
    else showMsg('Error: ' + error.message, true);
  };

  const handleDiaImageFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setDiaImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setDiaImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const importMenuDia = async () => {
    if (!diaText.trim() && !diaImagePreview) return;
    setDiaImporting(true); setDiaParsedItems([]);
    try {
      const body = diaImagePreview && diaImageFile
        ? { image: diaImagePreview.split(',')[1], image_type: diaImageFile.type }
        : { text: diaText };
      const res = await fetch('/api/menu-analyzer', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Error ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDiaParsedItems((data.menu_items || []).map(item => ({ ...item, selected: true })));
      showMsg(`✓ ${data.menu_items?.length || 0} platos detectados`);
    } catch(err) { showMsg('Error al analizar: ' + err.message, true); }
    finally { setDiaImporting(false); }
  };

  const importarMenuDiaSeleccionados = async () => {
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const hoy = dias[new Date().getDay()];
    const toImport = diaParsedItems.filter(i => i.selected);
    if (!toImport.length) return;
    // Borrar los platos del menú del día de hoy antes de importar
    await supabase.from('menu_items').delete()
      .eq('restaurant_id', selectedRestId)
      .eq('category', 'Menú del Día')
      .like('notes', `menu_dia_%`);
    for (const item of toImport) {
      await supabase.from('menu_items').insert({
        restaurant_id: selectedRestId,
        category: 'Menú del Día',
        name: item.name,
        description: item.description || null,
        price: parseFloat(item.price) || 0,
        price_type: item.price_type || 'por persona',
        allergens: item.allergens || [],
        available: true,
        notes: `menu_dia_${hoy.toLowerCase()}`,
        source: 'menu_dia'
      });
    }
    showMsg(`${toImport.length} platos del menú del día importados ✓`);
    setDiaParsedItems([]); setDiaText(''); setDiaImagePreview(''); setDiaImageFile(null);
    loadAll();
  };

  const importFromPdf = async () => {
    if (!pdfText.trim() && !imagePreview) return;
    setImporting(true); setParsedItems([]);
    try {
      if (imagePreview && imageFile) {
        showMsg('Analizando imagen...');
        const parsed = await callClaude(null, imagePreview.split(',')[1], imageFile.type);
        setParsedItems((parsed.menu_items || []).map(item => ({ ...item, selected: true })));
        showMsg(`✓ ${parsed.menu_items?.length || 0} platos detectados`);
      } else {
        const cleanedText = cleanMenuText(pdfText);
        const chunks = splitTextInChunks(cleanedText, 2000);
        const allItems = [];
        for (let i = 0; i < chunks.length; i++) {
          showMsg(`Analizando parte ${i + 1} de ${chunks.length}...`);
          const parsed = await callClaude(chunks[i], null, null);
          allItems.push(...(parsed.menu_items || []));
        }
        const unique = allItems.filter((item, idx, arr) => arr.findIndex(x => x.name.toLowerCase() === item.name.toLowerCase()) === idx);
        setParsedItems(unique.map(item => ({ ...item, selected: true })));
        showMsg(`✓ ${unique.length} platos detectados`);
      }
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
  // Dividir mesas por zona
  const tablesBySalon = tables.filter(t => t.zone === 'interior' || t.zone === 'salon' || !t.zone);
  const tablesByTerraza = tables.filter(t => t.zone === 'terraza');
  const tablesOther = tables.filter(t => t.zone && t.zone !== 'interior' && t.zone !== 'salon' && t.zone !== 'terraza');

  // Pantalla de PIN
  if (!pinUnlocked) return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:'1rem' }}>
      <div style={{ background:'#1A1A1A', border:'1px solid rgba(200,169,110,0.2)', borderRadius:'16px', padding:'2.5rem 2rem', width:'100%', maxWidth:'340px', textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🔐</div>
        <h2 style={{ color:'#C8A96E', fontFamily:'Playfair Display,serif', marginBottom:'0.5rem', fontSize:'1.4rem' }}>Panel de Administración</h2>
        <p style={{ color:'#A6A19A', fontSize:'0.85rem', marginBottom:'2rem' }}>Introduce el PIN para acceder</p>
        <input
          type="password"
          value={pinInput}
          onChange={e => { setPinInput(e.target.value); setPinError(''); }}
          onKeyPress={e => { if (e.key==='Enter') { if (pinInput===ADMIN_PIN) setPinUnlocked(true); else { setPinError('PIN incorrecto'); setPinInput(''); } } }}
          placeholder="• • • •"
          maxLength={4}
          autoFocus
          style={{ width:'100%', padding:'0.875rem', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#FAF7F2', fontSize:'1.8rem', textAlign:'center', letterSpacing:'0.6rem', outline:'none', boxSizing:'border-box', marginBottom:'0.75rem' }}
        />
        {pinError && <p style={{ color:'#C07070', fontSize:'0.85rem', margin:'0 0 0.75rem' }}>{pinError}</p>}
        <button
          onClick={() => { if (pinInput===ADMIN_PIN) setPinUnlocked(true); else { setPinError('PIN incorrecto'); setPinInput(''); } }}
          style={{ width:'100%', padding:'0.875rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'10px', fontWeight:700, fontSize:'1rem', cursor:'pointer' }}
        >Entrar</button>
      </div>
    </div>
  );

  if (loading) return <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', color:'#C8A96E', fontFamily:'Inter,sans-serif' }}>Cargando...</div>;

  return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', fontFamily:'Inter,sans-serif', color:'#FAF7F2' }}>
      <header style={{ background:'#1A1A1A', borderBottom:'1px solid rgba(200,169,110,0.15)', padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', color:'#C8A96E', fontSize:'clamp(1.1rem,3vw,1.4rem)', margin:0 }}>Panel de Administración</h1>
          <p style={{ color:'#A6A19A', fontSize:'0.8rem', margin:0 }}>{user?.email} — {restaurant.name || selectedRestId}</p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <a href="/caja" style={{ padding:'0.5rem 1rem', background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', textDecoration:'none', fontSize:'0.85rem' }}>Caja</a>
          <button onClick={logout} style={{ padding:'0.5rem 0.75rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#A6A19A', cursor:'pointer', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
            <LogOut size={13}/> Salir
          </button>
        </div>
      </header>

      {msg && <div style={{ padding:'0.75rem 1.5rem', background: msg.error ? 'rgba(192,112,112,0.15)' : 'rgba(142,155,119,0.15)', color: msg.error ? '#C07070' : '#8E9B77', fontSize:'0.9rem', textAlign:'center' }}>{msg.text}</div>}

      <div style={{ background:'#1A1A1A', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 1rem', display:'flex', gap:'0', overflowX:'auto' }}>
        {[['branding','⚙️ Config'],['tables','📍 Mesas'],['menu','🍽️ Carta'],['pdf','📄 PDF'],['menudia','🍱 Menú Día']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding:'0.875rem 1rem', background:'none', border:'none', borderBottom: activeTab===tab ? '2px solid #C8A96E' : '2px solid transparent', color: activeTab===tab ? '#C8A96E' : '#A6A19A', cursor:'pointer', fontWeight: activeTab===tab ? 600 : 400, fontSize:'0.85rem', whiteSpace:'nowrap' }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:'1.25rem', maxWidth:'1200px', margin:'0 auto' }}>

        {/* CONFIG */}
        {activeTab === 'branding' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.5rem' }}>
            <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.5rem' }}>
              <h2 style={{ color:'#C8A96E', fontSize:'1.05rem', marginBottom:'1.25rem', marginTop:0 }}>Identidad y Marca</h2>
              <div style={{ marginBottom:'1.25rem' }}>
                <label style={lblSt}>Logo del Restaurante</label>
                {branding.logo_url && <img src={branding.logo_url} alt="logo" style={{ height:'60px', objectFit:'contain', marginBottom:'0.5rem', borderRadius:'4px', background:'rgba(255,255,255,0.05)', padding:'4px', display:'block' }} />}
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  <input value={branding.logo_url || ''} onChange={e => setBranding({...branding, logo_url: e.target.value})} placeholder="URL o sube archivo..." style={{...inputSt, flex:1}} />
                  <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} style={uploadBtnSt}>
                    <Image size={14}/> {uploadingLogo ? '...' : 'Subir'}
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}} />
                </div>
              </div>
              <div style={{ marginBottom:'1.25rem' }}>
                <label style={lblSt}>Foto de Portada (fondo del chat de mesa)</label>
                {branding.hero_image_url && <img src={branding.hero_image_url} alt="hero" style={{ width:'100%', height:'90px', objectFit:'cover', marginBottom:'0.5rem', borderRadius:'6px', display:'block' }} />}
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  <input value={branding.hero_image_url || ''} onChange={e => setBranding({...branding, hero_image_url: e.target.value})} placeholder="URL o sube imagen..." style={{...inputSt, flex:1}} />
                  <button onClick={() => heroInputRef.current?.click()} disabled={uploadingHero} style={uploadBtnSt}>
                    <Upload size={14}/> {uploadingHero ? '...' : 'Subir'}
                  </button>
                  <input ref={heroInputRef} type="file" accept="image/*" onChange={handleHeroUpload} style={{display:'none'}} />
                </div>
              </div>
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

        {/* MESAS */}
        {activeTab === 'tables' && (
          <div>
            <h2 style={{ color:'#C8A96E', fontSize:'1.2rem', marginBottom:'1.5rem', marginTop:0 }}>Gestión de Mesas y QR</h2>
            <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.5rem' }}>
              <h3 style={{ fontSize:'0.95rem', marginBottom:'1rem', marginTop:0 }}>Añadir Mesa</h3>
              <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'flex-end' }}>
                <div><label style={lblSt}>Nombre</label><input value={newTableName} onChange={e => setNewTableName(e.target.value)} placeholder="Mesa 5" style={{...inputSt, width:'140px'}} onKeyPress={e => e.key==='Enter' && addTable()}/></div>
                <div><label style={lblSt}>Zona</label><select value={newTableZone} onChange={e => setNewTableZone(e.target.value)} style={{...inputSt, width:'120px'}}><option value="interior">Salón</option><option value="terraza">Terraza</option><option value="privado">Privado</option></select></div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', paddingBottom:'2px' }}><input type="checkbox" checked={newTableSeasonal} onChange={e => setNewTableSeasonal(e.target.checked)} style={{ width:'15px', height:'15px' }}/><label style={{ fontSize:'0.85rem', color:'#A6A19A' }}>Estacional</label></div>
                <button onClick={addTable} style={{ padding:'0.6rem 1.25rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' }}><Plus size={14}/> Añadir</button>
              </div>
            </div>

            {/* SALÓN */}
            {tablesBySalon.length > 0 && (
              <div style={{ marginBottom:'2rem' }}>
                <h3 style={{ color:'#C8A96E', fontSize:'1rem', borderBottom:'1px solid rgba(200,169,110,0.15)', paddingBottom:'0.5rem', marginBottom:'1rem' }}>🏠 Salón Interior ({tablesBySalon.length} mesas)</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'1rem' }}>
                  {tablesBySalon.map(tbl => <TableCard key={tbl.table_id} tbl={tbl} getQrImageUrl={getQrImageUrl} getTableUrl={getTableUrl} deleteTable={deleteTable} />)}
                </div>
              </div>
            )}

            {/* TERRAZA */}
            {tablesByTerraza.length > 0 && (
              <div style={{ marginBottom:'2rem' }}>
                <h3 style={{ color:'#D9A05B', fontSize:'1rem', borderBottom:'1px solid rgba(217,160,91,0.15)', paddingBottom:'0.5rem', marginBottom:'1rem' }}>☀️ Terraza ({tablesByTerraza.length} mesas)</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'1rem' }}>
                  {tablesByTerraza.map(tbl => <TableCard key={tbl.table_id} tbl={tbl} getQrImageUrl={getQrImageUrl} getTableUrl={getTableUrl} deleteTable={deleteTable} zoneColor="#D9A05B" />)}
                </div>
              </div>
            )}

            {/* OTROS */}
            {tablesOther.length > 0 && (
              <div style={{ marginBottom:'2rem' }}>
                <h3 style={{ color:'#A6A19A', fontSize:'1rem', borderBottom:'1px solid rgba(166,161,154,0.15)', paddingBottom:'0.5rem', marginBottom:'1rem' }}>📍 Otras zonas ({tablesOther.length} mesas)</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'1rem' }}>
                  {tablesOther.map(tbl => <TableCard key={tbl.table_id} tbl={tbl} getQrImageUrl={getQrImageUrl} getTableUrl={getTableUrl} deleteTable={deleteTable} zoneColor="#A6A19A" />)}
                </div>
              </div>
            )}

            {tables.length === 0 && <p style={{ color:'#A6A19A', textAlign:'center', padding:'2rem' }}>No hay mesas. Añade la primera mesa arriba.</p>}
          </div>
        )}

        {/* CARTA */}
        {activeTab === 'menu' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
              <h2 style={{ color:'#C8A96E', fontSize:'1.2rem', margin:0 }}>Carta ({menuItems.length} platos)</h2>
              <button onClick={() => setShowClearPin(true)} style={{ padding:'0.5rem 1rem', background:'none', border:'1px solid rgba(192,112,112,0.4)', borderRadius:'6px', color:'#C07070', cursor:'pointer', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <AlertTriangle size={13}/> Borrar toda la carta
              </button>
            </div>

            {/* Añadir plato */}
            <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.5rem' }}>
              <h3 style={{ fontSize:'0.95rem', marginBottom:'1rem', marginTop:0 }}>Añadir Plato</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'0.75rem' }}>
                <div><label style={lblSt}>Nombre *</label><input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Croquetas" style={inputSt}/></div>
                <div><label style={lblSt}>Categoría</label><select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} style={inputSt}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label style={lblSt}>Precio (€) *</label><input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="12.50" style={inputSt}/></div>
                <div><label style={lblSt}>Tipo precio</label><select value={newItem.price_type} onChange={e => setNewItem({...newItem, price_type: e.target.value})} style={inputSt}>{['por ración','por persona','por unidad','precio fijo','por kilo'].map(t => <option key={t}>{t}</option>)}</select></div>
                <div style={{ gridColumn:'1/-1' }}><label style={lblSt}>Descripción</label><input value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Descripción..." style={inputSt}/></div>
                <div><label style={lblSt}>Alérgenos (comas)</label><input value={newItem.allergens} onChange={e => setNewItem({...newItem, allergens: e.target.value})} placeholder="gluten, lacteos" style={inputSt}/></div>
              </div>
              <button onClick={addMenuItem} style={{ marginTop:'1rem', padding:'0.6rem 1.5rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' }}><Plus size={14}/> Añadir Plato</button>
            </div>

            {/* Listado por categoría */}
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
                        <button onClick={() => deleteMenuItem(item.id, item.name)} style={{...iconBtnSt, color:'#C07070', borderColor:'rgba(192,112,112,0.3)'}}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PDF */}
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
                      <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:'0.88rem' }}>{item.name}</div><div style={{ fontSize:'0.75rem', color:'#A6A19A' }}>{item.category}</div></div>
                      <div style={{ fontWeight:700, color:'#C8A96E' }}>{parseFloat(item.price||0).toFixed(2)}€</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MENÚ DEL DÍA */}
        {activeTab === 'menudia' && (
          <div>
            <h2 style={{ color:'#C8A96E', fontSize:'1.2rem', marginBottom:'0.5rem', marginTop:0 }}>Menú del Día</h2>
            <p style={{ color:'#A6A19A', fontSize:'0.88rem', marginBottom:'1.5rem' }}>
              Pega el texto o sube una foto del menú del día. Claude lo analiza y puedes importar los platos directamente a la categoría "Menú del Día". Cada importación reemplaza el menú anterior.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.25rem', marginBottom:'1.25rem' }}>
              <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem', marginBottom:'0.875rem', marginTop:0 }}>Texto del menú del día</h3>
                <textarea value={diaText} onChange={e => setDiaText(e.target.value)} rows={10}
                  placeholder={"Ej: Primero: Ensalada mixta / Sopa\nSegundo: Merluza / Pollo asado\nPostre: Flan casero\nBebida: Agua o vino\nPrecio: 12€"}
                  style={{...inputSt, resize:'vertical', width:'100%', fontFamily:'monospace', fontSize:'0.82rem', boxSizing:'border-box'}}/>
              </div>
              <div style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem', marginBottom:'0.875rem', marginTop:0 }}>Foto del Menú del Día</h3>
                <label style={{ display:'block', border:'2px dashed rgba(200,169,110,0.3)', borderRadius:'8px', padding:'1.5rem', textAlign:'center', cursor:'pointer', color:'#A6A19A', fontSize:'0.88rem' }}>
                  {diaImagePreview
                    ? <img src={diaImagePreview} alt="preview" style={{ maxWidth:'100%', maxHeight:'180px', objectFit:'contain', borderRadius:'6px' }}/>
                    : <><Upload size={28} style={{ margin:'0 auto 0.5rem', display:'block', color:'#C8A96E' }}/> Haz clic para subir foto del menú</>
                  }
                  <input type="file" accept="image/*" onChange={handleDiaImageFile} style={{ display:'none' }}/>
                </label>
                {diaImagePreview && <button onClick={() => { setDiaImageFile(null); setDiaImagePreview(''); }} style={{ marginTop:'0.4rem', background:'none', border:'none', color:'#C07070', cursor:'pointer', fontSize:'0.82rem' }}>✕ Eliminar foto</button>}
              </div>
            </div>

            <button onClick={importMenuDia} disabled={diaImporting || (!diaText.trim() && !diaImagePreview)}
              style={{ padding:'0.875rem 2rem', background: diaImporting ? '#555' : '#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'8px', fontWeight:700, cursor: diaImporting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.25rem' }}>
              {diaImporting ? '⏳ Analizando...' : '🤖 Analizar con Claude'}
            </button>

            {diaParsedItems.length > 0 && (
              <div style={{ background:'#1A1A1A', border:'1px solid rgba(200,169,110,0.2)', borderRadius:'12px', padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                  <h3 style={{ margin:0, fontSize:'1rem' }}>Detectados: {diaParsedItems.length} platos</h3>
                  <button onClick={importarMenuDiaSeleccionados} style={{ padding:'0.6rem 1.25rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                    <Check size={13}/> Importar al Menú del Día
                  </button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  {diaParsedItems.map((item, idx) => (
                    <div key={idx} style={{ display:'flex', alignItems:'center', gap:'0.75rem', background:'#0D0D0D', borderRadius:'6px', padding:'0.625rem 0.75rem' }}>
                      <input type="checkbox" checked={item.selected} onChange={e => setDiaParsedItems(prev => prev.map((p,i) => i===idx ? {...p, selected: e.target.checked} : p))} style={{ width:'15px', height:'15px', flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{item.name}</div>
                        <div style={{ fontSize:'0.75rem', color:'#A6A19A' }}>{item.description || item.category}</div>
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


      {/* Modal confirmación borrado */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001, padding:'1rem' }}>
          <div style={{ background:'#1A1A1A', border:'1px solid rgba(192,112,112,0.3)', borderRadius:'12px', padding:'1.75rem', width:'100%', maxWidth:'360px', textAlign:'center' }}>
            <Trash2 size={36} style={{ color:'#C07070', margin:'0 auto 1rem', display:'block' }}/>
            <h3 style={{ color:'#FAF7F2', margin:'0 0 0.5rem' }}>¿Eliminar {confirmDelete.type === 'item' ? 'plato' : 'mesa'}?</h3>
            <p style={{ color:'#A6A19A', fontSize:'0.9rem', margin:'0 0 1.5rem' }}><strong style={{color:'#FAF7F2'}}>{confirmDelete.name}</strong><br/>Esta acción no se puede deshacer.</p>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex:1, padding:'0.75rem', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'8px', color:'#A6A19A', cursor:'pointer' }}>Cancelar</button>
              <button onClick={executeDelete} style={{ flex:1, padding:'0.75rem', background:'#C07070', color:'#fff', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

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
                <div>
                  <label style={lblSt}>Precio (€)</label>
                  <input type="number" step="0.01" value={editItem.price||''} onChange={e => setEditItem({...editItem, price: e.target.value})} style={inputSt}/>
                  {editItem.price_type === 'por kilo' && (
                    <p style={{ fontSize:'0.72rem', color:'#D9A05B', margin:'0.3rem 0 0' }}>⚠️ Precio por kilo — Carlos recomendará cantidad según comensales</p>
                  )}
                </div>
                <div>
                  <label style={lblSt}>Tipo precio</label>
                  <select value={editItem.price_type||''} onChange={e => setEditItem({...editItem, price_type: e.target.value})} style={inputSt}>
                    {['por ración','por persona','por unidad','precio fijo','por kilo'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={lblSt}>Alérgenos (comas)</label><input value={typeof editItem.allergens === 'string' ? editItem.allergens : (editItem.allergens||[]).join(', ')} onChange={e => setEditItem({...editItem, allergens: e.target.value})} style={inputSt}/></div>
              <div><label style={lblSt}>Notas internas</label><input value={editItem.notes||''} onChange={e => setEditItem({...editItem, notes: e.target.value})} style={inputSt}/></div>

              {/* Foto del plato */}
              <div>
                <label style={lblSt}>Foto del Plato (opcional — prueba)</label>
                <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                  {editItem.image_url && (
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <img src={editItem.image_url} alt="plato" style={{ width:'64px', height:'64px', objectFit:'cover', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)' }}/>
                      <button onClick={() => setEditItem({...editItem, image_url: null})} style={{ position:'absolute', top:'-6px', right:'-6px', background:'#C07070', border:'none', borderRadius:'50%', width:'18px', height:'18px', cursor:'pointer', color:'#fff', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>✕</button>
                    </div>
                  )}
                  <label style={{ flex:1, padding:'0.6rem', border:'1px dashed rgba(200,169,110,0.4)', borderRadius:'8px', textAlign:'center', cursor:'pointer', color:'#A6A19A', fontSize:'0.82rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                    <Image size={14} style={{ color:'#C8A96E' }}/> {editItem.image_url ? 'Cambiar foto' : 'Subir foto del plato'}
                    <input type="file" accept="image/*" onChange={handleDishImageUpload} style={{ display:'none' }}/>
                  </label>
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <input type="checkbox" id="avail" checked={editItem.available} onChange={e => setEditItem({...editItem, available: e.target.checked})} style={{ width:'15px', height:'15px' }}/>
                <label htmlFor="avail" style={{ fontSize:'0.85rem' }}>Disponible</label>
              </div>
            </div>
            <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem' }}>
              <button onClick={() => setEditItem(null)} style={{ flex:1, padding:'0.75rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#A6A19A', cursor:'pointer' }}>Cancelar</button>
              <button onClick={saveEditItem} style={{ flex:1, padding:'0.75rem', background:'#C8A96E', color:'#0D0D0D', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIN borrar carta */}
      {showClearPin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div style={{ background:'#1A1A1A', border:'1px solid rgba(192,112,112,0.3)', borderRadius:'12px', padding:'2rem', width:'100%', maxWidth:'360px', textAlign:'center' }}>
            <AlertTriangle size={40} style={{ color:'#C07070', margin:'0 auto 1rem', display:'block' }}/>
            <h3 style={{ color:'#C07070', margin:'0 0 0.5rem' }}>Borrar toda la carta</h3>
            <p style={{ color:'#A6A19A', fontSize:'0.85rem', margin:'0 0 1.5rem' }}>Esta acción borrará <strong>todos los platos</strong> permanentemente. Introduce el PIN para confirmar.</p>
            <input type="password" value={clearPin} onChange={e => setClearPin(e.target.value)} placeholder="PIN (1234)" maxLength={4} style={{...inputSt, textAlign:'center', fontSize:'1.5rem', letterSpacing:'0.5rem', marginBottom:'1rem'}} onKeyPress={e => e.key==='Enter' && clearAllMenu()} autoFocus/>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => { setShowClearPin(false); setClearPin(''); }} style={{ flex:1, padding:'0.75rem', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#A6A19A', cursor:'pointer' }}>Cancelar</button>
              <button onClick={clearAllMenu} style={{ flex:1, padding:'0.75rem', background:'#C07070', color:'#fff', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>Borrar todo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente tabla card
function TableCard({ tbl, getQrImageUrl, getTableUrl, deleteTable, zoneColor = '#C8A96E' }) {
  return (
    <div style={{ background:'#1A1A1A', border:`1px solid rgba(255,255,255,0.06)`, borderRadius:'12px', padding:'1.25rem', textAlign:'center' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.875rem' }}>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontWeight:700 }}>{tbl.name}</div>
          <div style={{ fontSize:'0.72rem', color: zoneColor }}>{tbl.zone === 'interior' ? 'Salón' : tbl.zone || 'Sin zona'} {tbl.seasonal ? '• Estacional' : ''}</div>
        </div>
        <button onClick={() => deleteTable(tbl.table_id, tbl.name)} style={{ background:'none', border:'1px solid rgba(192,112,112,0.3)', borderRadius:'6px', padding:'0.3rem', cursor:'pointer', color:'#C07070' }}><Trash2 size={13}/></button>
      </div>
      <img src={getQrImageUrl(tbl.table_id)} alt={`QR ${tbl.name}`} style={{ width:'120px', height:'120px', borderRadius:'8px', background:'white', padding:'6px' }}/>
      <div style={{ marginTop:'0.75rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
        <a href={getQrImageUrl(tbl.table_id)} download={`QR-${tbl.name}.png`} target="_blank" rel="noreferrer"
          style={{ padding:'0.4rem', background:'rgba(200,169,110,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', textDecoration:'none', fontSize:'0.75rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
          <QrCode size={11}/> Descargar QR
        </a>
        <a href={getTableUrl(tbl.table_id)} target="_blank" rel="noreferrer"
          style={{ padding:'0.35rem', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', color:'#A6A19A', textDecoration:'none', fontSize:'0.72rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
          <Eye size={11}/> Probar enlace
        </a>
      </div>
    </div>
  );
}

const inputSt = { width:'100%', padding:'0.6rem 0.75rem', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#FAF7F2', fontSize:'0.87rem', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' };
const lblSt = { display:'block', fontSize:'0.78rem', color:'#A6A19A', marginBottom:'0.3rem' };
const iconBtnSt = { background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', padding:'0.35rem', cursor:'pointer', color:'#A6A19A', display:'flex', alignItems:'center', justifyContent:'center' };
const uploadBtnSt = { padding:'0.5rem 0.75rem', background:'rgba(200,169,110,0.15)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:'6px', color:'#C8A96E', cursor:'pointer', fontSize:'0.8rem', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'0.3rem' };

export default AdminView;
