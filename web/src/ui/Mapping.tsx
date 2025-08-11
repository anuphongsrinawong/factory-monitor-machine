import React, { useEffect, useState } from 'react';
import { api } from '../utils/http';

type Device = { id: number; name: string };
type Tag = { id: number; deviceId: number; name: string; address: string; dataType: string; access: string };

export function Mapping() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

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
          <button className="bg-blue-600 text-white px-3 py-2 rounded">Add New Tag</button>
        </div>
        <div className="p-4">
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

