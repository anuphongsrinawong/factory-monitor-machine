import React from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { Mapping } from './Mapping';
import { Alarms } from './Alarms';
import { Login } from './Login';
import { AuthProvider, useAuth } from '../utils/auth';

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-slate-800 text-slate-200 flex flex-col">
        <div className="h-16 flex items-center justify-center text-xl font-bold border-b border-slate-700">
          Factory Control
        </div>
        <nav className="flex-grow">
          <Link to="/" className="block px-6 py-4 hover:bg-slate-700">Dashboard</Link>
          <Link to="/mapping" className="block px-6 py-4 hover:bg-slate-700">Data Mapping</Link>
          <Link to="/alarms" className="block px-6 py-4 hover:bg-slate-700">Alarm History</Link>
        </nav>
        <div className="p-4 border-t border-slate-700 text-sm">
          <div>Logged in as:</div>
          <div className="font-bold text-white">{user?.name}</div>
          <button className="text-blue-400 hover:text-blue-300" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mapping" element={<Mapping />} />
          <Route path="/alarms" element={<Alarms />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Protected />} />
      </Routes>
    </AuthProvider>
  );
}

function Protected() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" />;
  return <Shell />;
}

