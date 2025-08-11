import React, { useEffect, useState } from 'react';
import { api } from '../utils/http';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../utils/auth';
import { Link } from 'react-router-dom';

type Tag = { id: number; name: string };
type Device = { id: number; name: string; type: string; status: string; tags?: Tag[] };
type TagUpdate = { tagId: number; value: string };

export function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  const [values, setValues] = useState<Record<number, string>>({});

  // remove add new machine from dashboard

  useEffect(() => {
    api.get('/devices').then(async res => {
      const list: Device[] = res.data;
      setDevices(list);
      // preload tag values (limit first 3 per device to reduce calls)
      const fetches: Array<Promise<void>> = [];
      list.forEach(d => {
        const topTags = (d.tags ?? []).slice(0, 3);
        topTags.forEach(t => {
          fetches.push(
            api.get(`/tags/${t.id}/value`).then(r => {
              setValues(prev => ({ ...prev, [t.id]: r.data.value ?? '-' }));
            }).catch(() => {})
          );
        });
      });
      await Promise.all(fetches);
    });
    const socket: Socket = io(import.meta.env.VITE_API_WS || 'http://localhost:3001');
    socket.on('tag:update', (msg: TagUpdate) => {
      setValues(prev => ({ ...prev, [msg.tagId]: String(msg.value) }));
    });
    return () => socket.close();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((d) => (
          <Link key={d.id} to={`/machines/${d.id}`} className="bg-white rounded-xl border shadow block hover:ring-2 ring-blue-300">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{d.name}</h2>
              <span className={`text-sm font-semibold ${d.status === 'ONLINE' ? 'text-green-600' : 'text-red-600'}`}>{d.status}</span>
            </div>
            <div className="p-4 text-sm text-slate-600 space-y-2">
              <div>ประเภท: {d.type}</div>
              {(d.tags && d.tags.length > 0) ? (
                <div>
                  <div className="font-semibold mb-1">Tag Values</div>
                  <ul className="text-slate-700">
                    {d.tags.slice(0, 3).map(t => (
                      <li key={t.id} className="flex justify-between gap-3"><span>{t.name}</span><span className="font-mono">{values[t.id] ?? '-'}</span></li>
                    ))}
                    {d.tags.length > 3 && <li className="text-slate-400">+{d.tags.length - 3} more…</li>}
                  </ul>
                </div>
              ) : (
                <div className="text-slate-400">No tags configured</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

