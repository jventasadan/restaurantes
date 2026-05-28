import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClientView from './components/ClientView';
import CajaView from './components/CajaView';
import AdminView from './components/AdminView';
import DemoSelector from './components/DemoSelector';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal: Muestra el selector de demostración si no hay parámetros */}
        <Route path="/" element={<DemoSelector />} />
        
        {/* Ruta de Mesa (QR): Escanea mesa y restaurante */}
        <Route path="/mesa" element={<ClientView />} />
        
        {/* Panel de Caja en Tiempo Real */}
        <Route path="/caja" element={<CajaView />} />
        
        {/* Panel de Administración */}
        <Route path="/admin" element={<AdminView />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
