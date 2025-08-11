import React, { useEffect, useState } from 'react';
import { api } from '../utils/http';
import { io } from 'socket.io-client';

type Alarm = { id: number; deviceId: number; code: string; message: string; severity: 'INFO'|'WARNING'|'CRITICAL'; occurredAt: string; clearedAt?: string };

export function Alarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    api.get('/alarms').then(r => setAlarms(r.data));
    const s = io(import.meta.env.VITE_API_WS || 'http://localhost:3001');
    s.on('alarm:new', (a: Alarm) => setAlarms(prev => [a, ...prev]));
    return () => s.close();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Alarm History</h1>
      <div className="bg-white rounded-xl border shadow">
        <div className="p-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Device</th>
                <th className="p-2">Code</th>
                <th className="p-2">Message</th>
                <th className="p-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {alarms.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="p-2">{new Date(a.occurredAt).toLocaleString()}</td>
                  <td className="p-2">#{a.deviceId}</td>
                  <td className="p-2 font-mono">{a.code}</td>
                  <td className="p-2">{a.message}</td>
                  <td className={`p-2 font-semibold ${a.severity === 'CRITICAL' ? 'text-red-600' : a.severity === 'WARNING' ? 'text-orange-600' : 'text-slate-600'}`}>{a.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

