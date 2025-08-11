import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">เข้าสู่ระบบ</h1>
        <label className="block mb-2 text-sm">อีเมล</label>
        <input className="w-full border rounded p-2 mb-4" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block mb-2 text-sm">รหัสผ่าน</label>
        <input type="password" className="w-full border rounded p-2 mb-4" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
}

