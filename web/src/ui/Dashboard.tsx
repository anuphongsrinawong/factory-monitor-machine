import React, { useEffect, useState } from 'react';
import { api } from '../utils/http';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../utils/auth';

type Device = { id: number; name: string; type: string; status: string };
type TagUpdate = { tagId: number; value: string };

export function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ENGINEER';

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'KUKA' | 'MITSUBISHI' | 'OTHER'>('OTHER');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/devices').then(res => setDevices(res.data));
    const socket: Socket = io(import.meta.env.VITE_API_WS || 'http://localhost:3001');
    socket.on('tag:update', (_: TagUpdate) => {
      // Could store latest tag values in state; keeping simple for demo
    });
    return () => socket.close();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
        {canManage && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowNew(true)}>
            Add New Machine
          </button>
        )}
      </header>
      {showNew && (
        <div className="bg-white border rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3">สร้างเครื่องใหม่</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border rounded p-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <select className="border rounded p-2" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="KUKA">KUKA</option>
              <option value="MITSUBISHI">MITSUBISHI</option>
              <option value="OTHER">OTHER</option>
            </select>
            <div className="flex gap-2">
              <button
                disabled={creating || !name}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                onClick={async () => {
                  try {
                    setCreating(true); setError(null);
                    await api.post('/devices', { name, type });
                    const res = await api.get('/devices');
                    setDevices(res.data);
                    setShowNew(false); setName('');
                  } catch (e: any) {
                    setError(e?.response?.data?.message ?? 'สร้างไม่สำเร็จ');
                  } finally { setCreating(false); }
                }}
              >บันทึก</button>
              <button className="px-4 py-2 border rounded" onClick={() => setShowNew(false)}>ยกเลิก</button>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{d.name}</h2>
              <span className={`text-sm font-semibold ${d.status === 'ONLINE' ? 'text-green-600' : 'text-red-600'}`}>{d.status}</span>
            </div>
            <div className="p-4 text-sm text-slate-600">
              ประเภท: {d.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

