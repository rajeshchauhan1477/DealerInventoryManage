import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminDashboard from './components/AdminDashboard';
import MobileClient from './components/MobileClient';
import Auth from './components/Auth';
import { Smartphone } from 'lucide-react';

function AppContent() {
  const { token, user } = useAuth();

  // If not logged in, show Auth (which is mobile-styled)
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <Auth />
      </div>
    );
  }

  // Admin view
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Client view (Simulated Mobile)
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <MobileClient />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
