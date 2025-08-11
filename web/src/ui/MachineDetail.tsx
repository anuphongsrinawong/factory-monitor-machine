import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/http';
import { useAuth } from '../utils/auth';
import { io, Socket } from 'socket.io-client';

type Tag = { id: number; deviceId: number; name: string; address: string; dataType: string; access: string };
type Device = { id: number; name: string; type: string; status: string; protocol?: string; host?: string; port?: number; enabled?: boolean; settings?: any; tags: Tag[] };

export function MachineDetail() {
  const { id } = useParams();
  const deviceId = Number(id);
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState<{ name: string; address: string; dataType: string; access: string }>({ name: '', address: '', dataType: 'STRING', access: 'READ' });
  const [values, setValues] = useState<Record<number, { value: string | null; at: string | null }>>({});
  const [dragEnabled, setDragEnabled] = useState(false);
  const [order, setOrder] = useState<number[]>([]);

  async function refresh() {
    const r = await api.get(`/devices/${deviceId}`);
    setDevice(r.data);
  }

  useEffect(() => { refresh(); }, [deviceId]);

  // Load current values and subscribe socket
  useEffect(() => {
    if (!device) return;
    (async () => {
      const entries = await Promise.all(
        device.tags.map(async t => {
          try {
            const v = await api.get(`/tags/${t.id}/value`);
            return [t.id, { value: v.data.value ?? null, at: v.data.at ?? null }] as const;
          } catch {
            return [t.id, { value: null, at: null }] as const;
          }
        })
      );
      const map: Record<number, { value: string | null; at: string | null }> = {};
      for (const [k, v] of entries) map[k] = v;
      setValues(map);
    })();

    const socket: Socket = io(import.meta.env.VITE_API_WS || 'http://localhost:3001');
    const handler = (msg: { tagId: number; value: string }) => {
      setValues(prev => ({ ...prev, [msg.tagId]: { value: String(msg.value), at: new Date().toISOString() } }));
    };
    socket.on('tag:update', handler);
    return () => socket.off('tag:update', handler).close();
  }, [device?.id]);

  // Compute order and sorted tags
  useEffect(() => {
    if (!device) return;
    const saved = device.settings?.tagOrder as number[] | undefined;
    if (saved && Array.isArray(saved) && saved.length > 0) setOrder(saved);
    else setOrder(device.tags.map(t => t.id));
  }, [device?.id]);

  const tagsSorted: Tag[] = useMemo(() => {
    if (!device) return [];
    const idToTag = new Map(device.tags.map(t => [t.id, t] as const));
    const ordered: Tag[] = [];
    for (const id of order) {
      const t = idToTag.get(id);
      if (t) ordered.push(t);
    }
    // include any new tags not in order
    for (const t of device.tags) if (!order.includes(t.id)) ordered.push(t);
    return ordered;
  }, [device?.tags, order]);

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
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-500">ลากการ์ดเพื่อจัด Layout ตามต้องการ</div>
          {canManage && (
            <div className="flex gap-2">
              <button className={`px-3 py-2 border rounded ${dragEnabled ? 'bg-slate-800 text-white' : ''}`} onClick={() => setDragEnabled(!dragEnabled)}>{dragEnabled ? 'กำลังจัดวาง' : 'แก้ไข Layout'}</button>
              <button className="px-3 py-2 border rounded" onClick={() => setOrder(device.tags.map(t => t.id))}>รีเซ็ต</button>
              <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => {
                await api.patch(`/devices/${device.id}`, { settings: { ...(device.settings || {}), tagOrder: order } });
                refresh();
              }}>บันทึก Layout</button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tagsSorted.map(t => (
            <div
              key={t.id}
              draggable={dragEnabled}
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(t.id)); }}
              onDragOver={(e) => { if (dragEnabled) e.preventDefault(); }}
              onDrop={(e) => {
                if (!dragEnabled) return;
                const fromId = Number(e.dataTransfer.getData('text/plain'));
                const toId = t.id;
                if (!fromId || fromId === toId) return;
                const newOrder = [...order];
                const i = newOrder.indexOf(fromId);
                const j = newOrder.indexOf(toId);
                if (i >= 0 && j >= 0) {
                  [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
                  setOrder(newOrder);
                }
              }}
              className={`border rounded-lg p-3 bg-white shadow ${dragEnabled ? 'cursor-move ring-1 ring-dashed' : ''}`}
              title={dragEnabled ? 'ลากเพื่อสลับตำแหน่ง' : ''}
           >
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-slate-500">{t.dataType}</div>
              </div>
              <div className="text-xl font-mono">{values[t.id]?.value ?? '-'}</div>
              <div className="text-xs text-slate-400">{values[t.id]?.at ? new Date(values[t.id]!.at as string).toLocaleString() : ''}</div>
              {canManage && (
                <div className="mt-2 flex gap-2">
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
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

