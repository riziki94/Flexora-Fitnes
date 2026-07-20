import { useState, useMemo } from "react";
import type { DbDevice } from "~/lib/db-devices";
import { addDevice, updateDevice } from "~/lib/db-admin";

const TYPE_LABELS: Record<string, string> = {
  "smart-bench": "Smart Bench",
  "bus-shelter": "Bus Shelter",
  "sensor-pole": "Sensor Pole",
};

export function DevicePanel({ devices, onRefresh }: { devices: DbDevice[]; onRefresh: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", ip_address: "", device_type: "smart-bench", city: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const cities = useMemo(() => [...new Set(devices.map((d) => d.city).filter(Boolean))], [devices]);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const q = search.toLowerCase();
      if (q && !d.name.toLowerCase().includes(q) && !(d.device_code || "").toLowerCase().includes(q) && !(d.ip_address || "").toLowerCase().includes(q)) return false;
      if (typeFilter && d.device_type !== typeFilter) return false;
      if (cityFilter && d.city !== cityFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      return true;
    });
  }, [devices, search, typeFilter, cityFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    if (editId) {
      const result = await updateDevice({ id: editId, updates: form });
      setMsg(result.ok ? "Device updated" : result.error || "Update failed");
      if (result.ok) { setEditId(null); setShowAddForm(false); onRefresh(); }
    } else {
      const result = await addDevice(form);
      setMsg(result.ok ? "Device added" : result.error || "Add failed");
      if (result.ok) { setShowAddForm(false); setForm({ name: "", ip_address: "", device_type: "smart-bench", city: "" }); onRefresh(); }
    }
    setSaving(false);
  };

  const startEdit = (d: DbDevice) => {
    setEditId(d.id);
    setForm({ name: d.name, ip_address: d.ip_address || "", device_type: d.device_type, city: d.city || "" });
    setShowAddForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input type="text" placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm w-full sm:w-48" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm flex-1 sm:flex-none min-h-[44px]">
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm flex-1 sm:flex-none min-h-[44px]">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c} value={c || ""}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm flex-1 sm:flex-none min-h-[44px]">
          <option value="">All statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <button onClick={() => { setShowAddForm(!showAddForm); setEditId(null); setForm({ name: "", ip_address: "", device_type: "smart-bench", city: "" }); }}
          className="sm:ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors min-h-[44px] w-full sm:w-auto justify-center">
          <span className="text-lg leading-none">+</span> Add Device
        </button>
      </div>

      {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">{msg}</div>}

      {/* Add/Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? "Edit Device" : "Add New Device"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Device name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IP Address</label>
              <input required value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" placeholder="10.42.x.x" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="City" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving..." : editId ? "Save Changes" : "Add Device"}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setEditId(null); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Device Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Device</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No devices found</td></tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className={`border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer ${expandedId === d.id ? "bg-emerald-50/30" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${d.status === "online" ? "bg-emerald-500" : "bg-gray-300"}`} />
                        {d.name}
                      </div>
                      <div className="text-xs text-gray-400">{d.device_code}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[d.device_type] || d.device_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{d.city || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${d.status === "online" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(d); }}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 mr-3">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === d.id ? null : d.id); }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700">Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Detail */}
        {expandedId && (() => {
          const d = devices.find((dev) => dev.id === expandedId);
          if (!d) return null;
          const m = d.metrics || {};
          return (
            <div className="border-t border-gray-200 px-4 py-4 bg-gray-50/50">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Device Metrics — {d.name}</h4>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Solar Energy", value: `${m.solarEnergyKW ?? "—"} kW`, icon: "" },
                  { label: "Charging", value: `${m.chargingSessions ?? "—"} sessions`, icon: "" },
                  { label: "CO₂", value: `${m.co2ppm ?? "—"} ppm`, icon: "" },
                  { label: "NO₂", value: `${m.no2ppb ?? "—"} ppb`, icon: "" },
                  { label: "SO₂", value: `${m.so2ppb ?? "—"} ppb`, icon: "" },
                  { label: "H₂S", value: `${m.h2sppb ?? "—"} ppb`, icon: "" },
                  { label: "PM2.5", value: `${m.pm25 ?? "—"} µg/m³`, icon: "" },
                  { label: "Temperature", value: `${m.temperatureC ?? "—"}°C`, icon: "" },
                  { label: "Humidity", value: `${m.humidity ?? "—"}%`, icon: "" },
                  { label: "Lat/Lng", value: `${d.lat?.toFixed(4) ?? "—"}, ${d.lng?.toFixed(4) ?? "—"}`, icon: "" },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-lg bg-white border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">{metric.icon} {metric.label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
