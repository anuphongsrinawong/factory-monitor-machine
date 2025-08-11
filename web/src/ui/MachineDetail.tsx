import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/http';
import { useAuth } from '../utils/auth';

type Tag = { id: number; deviceId: number; name: string; address: string; dataType: string; access: string };
type Device = { id: number; name: string; type: string; status: string; protocol?: string; host?: string; port?: number; enabled?: boolean; tags: Tag[] };

export function MachineDetail() {
  const { id } = useParams();
  const deviceId = Number(id);
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState<{ name: string; address: string; dataType: string; access: string }>({ name: '', address: '', dataType: 'STRING', access: 'READ' });

  async function refresh() {
    const r = await api.get(`/devices/${deviceId}`);
    setDevice(r.data);
  }

  useEffect(() => { refresh(); }, [deviceId]);

  if (!device) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">เครื่อง #{device.id} - {device.name}</h1>
        <span className={`text-sm font-semibold ${device.status === 'ONLINE' ? 'text-green-600' : 'text-red-600'}`}>{device.status}</span>
      </div>

      {canManage && (
        <div className="bg-white border rounded p-4">
          <h3 className="font-semibold mb-2">การเชื่อมต่อ</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
            <select className="border rounded p-2" value={device.protocol ?? 'SIM'} onChange={e => setDevice({ ...device, protocol: e.target.value })}>
              <option value="SIM">SIM</option>
              <option value="OPCUA">OPCUA</option>
              <option value="MC">MC</option>
              <option value="KUKA_KRL">KUKA_KRL</option>
              <option value="MQTT">MQTT</option>
            </select>
            <input className="border rounded p-2" placeholder="Host/IP" value={device.host ?? ''} onChange={e => setDevice({ ...device, host: e.target.value })} />
            <input className="border rounded p-2" placeholder="Port" value={device.port ?? ''} onChange={e => setDevice({ ...device, port: Number(e.target.value) || undefined })} />
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={device.enabled ?? true} onChange={e => setDevice({ ...device, enabled: e.target.checked })} /> Enabled</label>
            <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => {
              setError(null);
              await api.patch(`/devices/${device.id}`, { protocol: device.protocol, host: device.host, port: device.port, enabled: device.enabled });
            }}>บันทึก</button>
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
      )}

      <div className="bg-white border rounded p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">แท็กของเครื่อง</h3>
          {canManage && (
            <div className="flex gap-2">
              <input className="border rounded p-2" placeholder="Tag Name" value={newTag.name} onChange={e => setNewTag({ ...newTag, name: e.target.value })} />
              <input className="border rounded p-2 font-mono" placeholder="Address" value={newTag.address} onChange={e => setNewTag({ ...newTag, address: e.target.value })} />
              <select className="border rounded p-2" value={newTag.dataType} onChange={e => setNewTag({ ...newTag, dataType: e.target.value })}>
                <option>BOOL</option>
                <option>INT</option>
                <option>REAL</option>
                <option>STRING</option>
              </select>
              <select className="border rounded p-2" value={newTag.access} onChange={e => setNewTag({ ...newTag, access: e.target.value })}>
                <option>READ</option>
                <option>WRITE</option>
                <option>READ_WRITE</option>
              </select>
              <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => {
                await api.post('/tags', { deviceId: device.id, ...newTag });
                setNewTag({ name: '', address: '', dataType: 'STRING', access: 'READ' });
                refresh();
              }}>เพิ่มแท็ก</button>
            </div>
          )}
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Address</th>
              <th className="p-2">Type</th>
              <th className="p-2">Access</th>
              {canManage && <th className="p-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {device.tags.map(t => (
              <tr key={t.id} className="border-b">
                <td className="p-2">{t.name}</td>
                <td className="p-2 font-mono">{t.address}</td>
                <td className="p-2">{t.dataType}</td>
                <td className="p-2">{t.access}</td>
                {canManage && (
                  <td className="p-2 flex gap-2">
                    <button className="px-2 py-1 border rounded" onClick={async () => {
                      const name = prompt('แก้ชื่อ', t.name) ?? t.name;
                      const address = prompt('แก้ Address', t.address) ?? t.address;
                      await api.patch(`/tags/${t.id}`, { name, address });
                      refresh();
                    }}>Edit</button>
                    <button className="px-2 py-1 border rounded text-red-600" onClick={async () => {
                      if (!confirm(`ลบแท็ก ${t.name}?`)) return;
                      await api.delete(`/tags/${t.id}`);
                      refresh();
                    }}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

