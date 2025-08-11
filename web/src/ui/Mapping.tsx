import React, { useEffect, useState } from 'react';
import { api } from '../utils/http';
import { useAuth } from '../utils/auth';

type Device = { id: number; name: string };
type Tag = { id: number; deviceId: number; name: string; address: string; dataType: string; access: string };

export function Mapping() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'ENGINEER';

  const [showNew, setShowNew] = useState(false);
  const [newTag, setNewTag] = useState<{ name: string; address: string; dataType: string; access: string }>({
    name: '', address: '', dataType: 'STRING', access: 'READ',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/devices').then(r => setDevices(r.data));
  }, []);

  useEffect(() => {
    if (selected) api.get('/tags', { params: { deviceId: selected } }).then(r => setTags(r.data));
  }, [selected]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Data Mapping Configuration</h1>
      <div className="bg-white rounded-xl border shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <label className="text-sm">Select Device: </label>
            <select className="border rounded p-2 ml-2" value={selected ?? ''} onChange={e => setSelected(Number(e.target.value))}>
              <option value="" disabled>เลือกเครื่อง</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {canManage && (
            <button className="bg-blue-600 text-white px-3 py-2 rounded" disabled={!selected} onClick={() => setShowNew(true)}>Add New Tag</button>
          )}
        </div>
        <div className="p-4">
          {showNew && (
            <div className="border rounded p-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input className="border rounded p-2" placeholder="Tag Name" value={newTag.name} onChange={e => setNewTag(v => ({...v, name: e.target.value}))} />
                <input className="border rounded p-2 font-mono" placeholder="Address" value={newTag.address} onChange={e => setNewTag(v => ({...v, address: e.target.value}))} />
                <select className="border rounded p-2" value={newTag.dataType} onChange={e => setNewTag(v => ({...v, dataType: e.target.value}))}>
                  <option>BOOL</option>
                  <option>INT</option>
                  <option>REAL</option>
                  <option>STRING</option>
                </select>
                <select className="border rounded p-2" value={newTag.access} onChange={e => setNewTag(v => ({...v, access: e.target.value}))}>
                  <option>READ</option>
                  <option>WRITE</option>
                  <option>READ_WRITE</option>
                </select>
                <div className="flex gap-2">
                  <button
                    disabled={creating || !selected || !newTag.name || !newTag.address}
                    className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    onClick={async () => {
                      if (!selected) return;
                      try {
                        setCreating(true); setError(null);
                        await api.post('/tags', { deviceId: selected, ...newTag });
                        const r = await api.get('/tags', { params: { deviceId: selected } });
                        setTags(r.data);
                        setShowNew(false);
                        setNewTag({ name: '', address: '', dataType: 'STRING', access: 'READ' });
                      } catch (e: any) {
                        setError(e?.response?.data?.message ?? 'สร้าง Tag ไม่สำเร็จ');
                      } finally { setCreating(false); }
                    }}
                  >บันทึก</button>
                  <button className="px-4 py-2 border rounded" onClick={() => setShowNew(false)}>ยกเลิก</button>
                </div>
              </div>
              {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            </div>
          )}
          <table className="w-full text-left text-slate-800 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">Tag Name</th>
                <th className="p-2">Address</th>
                <th className="p-2">Data Type</th>
                <th className="p-2">Access</th>
              </tr>
            </thead>
            <tbody>
              {tags.map(t => (
                <tr key={t.id} className="border-b">
                  <td className="p-2 font-semibold">{t.name}</td>
                  <td className="p-2 font-mono">{t.address}</td>
                  <td className="p-2">{t.dataType}</td>
                  <td className="p-2">{t.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

