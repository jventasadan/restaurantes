import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClientView from './components/ClientView';
import CajaView from './components/CajaView';
import AdminView from './components/AdminView';
import DemoSelector from './components/DemoSelector';
import AuthView from './components/AuthView';

function ProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('cv_user') || 'null');
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DemoSelector />} />
        <Route path="/mesa" element={<ClientView />} />
        <Route path="/auth" element={<AuthWrapper />} />
        <Route path="/caja" element={<ProtectedRoute><CajaView /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminView /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function AuthWrapper() {
  const handleLogin = (user) => {
    window.location.href = '/admin';
  };
  const existing = JSON.parse(localStorage.getItem('cv_user') || 'null');
  if (existing) return <Navigate to="/admin" replace />;
  return <AuthView onLogin={handleLogin} />;
}

export default App;
