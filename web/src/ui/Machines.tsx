import React, { useEffect, useState } from 'react';
import { api } from '../utils/http';
import { useAuth } from '../utils/auth';

type Device = { id: number; name: string; type: string; status: string; protocol?: string; host?: string; port?: number; enabled?: boolean };

export function Machines() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  const [devices, setDevices] = useState<Device[]>([]);
  const [editing, setEditing] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await api.get('/devices');
    setDevices(r.data);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Manage Machines</h1>
      <div className="bg-white border rounded-xl shadow">
        <div className="p-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Name</th>
                <th className="p-2">Type</th>
                <th className="p-2">Status</th>
                <th className="p-2">Protocol</th>
                <th className="p-2">Host</th>
                <th className="p-2">Port</th>
                <th className="p-2">Enabled</th>
                {canManage && <th className="p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="border-b">
                  <td className="p-2">{d.id}</td>
                  <td className="p-2">{d.name}</td>
                  <td className="p-2">{d.type}</td>
                  <td className="p-2">{d.status}</td>
                  <td className="p-2">{d.protocol ?? '-'}</td>
                  <td className="p-2">{d.host ?? '-'}</td>
                  <td className="p-2">{d.port ?? '-'}</td>
                  <td className="p-2">{(d.enabled ?? true) ? 'Yes' : 'No'}</td>
                  {canManage && (
                    <td className="p-2 flex gap-2">
                      <button className="px-2 py-1 border rounded" onClick={() => setEditing(d)}>แก้ไข</button>
                      <button className="px-2 py-1 border rounded text-red-600" onClick={async () => {
                        if (!confirm(`ลบเครื่อง ${d.name}?`)) return;
                        await api.delete(`/devices/${d.id}`);
                        refresh();
                      }}>ลบ</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {editing && (
            <div className="mt-6 border rounded p-3">
              <h3 className="font-semibold mb-2">แก้ไขเครื่อง #{editing.id}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className="border rounded p-2" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                <select className="border rounded p-2" value={editing.protocol ?? 'SIM'} onChange={e => setEditing({ ...editing, protocol: e.target.value })}>
                  <option value="SIM">SIM</option>
                  <option value="OPCUA">OPCUA</option>
                  <option value="MC">MC</option>
                  <option value="KUKA_KRL">KUKA_KRL</option>
                  <option value="MQTT">MQTT</option>
                </select>
                <input className="border rounded p-2" placeholder="Host/IP" value={editing.host ?? ''} onChange={e => setEditing({ ...editing, host: e.target.value })} />
                <input className="border rounded p-2" placeholder="Port" value={editing.port ?? ''} onChange={e => setEditing({ ...editing, port: Number(e.target.value) || undefined })} />
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.enabled ?? true} onChange={e => setEditing({ ...editing, enabled: e.target.checked })} /> Enabled</label>
              </div>
              {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              <div className="mt-3 flex gap-2">
                <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => {
                  try {
                    setError(null);
                    await api.patch(`/devices/${editing.id}`, {
                      name: editing.name,
                      protocol: editing.protocol,
                      host: editing.host,
                      port: editing.port,
                      enabled: editing.enabled,
                    });
                    setEditing(null);
                    refresh();
                  } catch (e: any) {
                    setError(e?.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
                  }
                }}>บันทึก</button>
                <button className="px-3 py-2 border rounded" onClick={() => setEditing(null)}>ปิด</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

