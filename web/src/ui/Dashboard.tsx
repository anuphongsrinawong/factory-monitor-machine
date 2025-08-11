import React, { useEffect, useState } from 'react';
import { api } from '../utils/http';
import { io, Socket } from 'socket.io-client';

type Device = { id: number; name: string; type: string; status: string };
type TagUpdate = { tagId: number; value: string };

export function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);

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
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Add New Machine</button>
      </header>
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

