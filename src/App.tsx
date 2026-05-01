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
        <div className="mb-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">System Preview</h1>
          <p className="text-slate-500 text-sm">
            This is a production-ready system with a separate Admin Web App and a simulated Mobile Client.
            Use <code className="bg-white px-1 rounded border">admin</code> / <code className="bg-white px-1 rounded border">123456</code> to access the dashboard.
          </p>
        </div>
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
      <div className="mb-6 flex items-center gap-4 bg-white p-2 rounded-full shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
          <Smartphone size={14} />
          Mobile Client View
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="text-xs text-slate-400 pr-4">
          Logged in as <span className="text-slate-900 font-bold">{user.username}</span>
        </div>
      </div>
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
