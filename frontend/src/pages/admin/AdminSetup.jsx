import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function AdminSetup() {
  const [zones, setZones] = useState([])
  const [pincodes, setPincodes] = useState([])
  const [rateCards, setRateCards] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [zoneForm, setZoneForm] = useState({ name: '', description: '' })
  const [pincodeForm, setPincodeForm] = useState({ pincode: '', area_name: '', zone_id: '' })
  const [rateForm, setRateForm] = useState({
    zone_id: '', order_type: 'B2C', is_intra_zone: 'true', rate_per_kg: '', cod_surcharge: '',
  })
  const [agentForm, setAgentForm] = useState({ name: '', email: '', password: '', phone: '' })

  const loadAll = () => {
    api.get('/admin/zones').then((res) => setZones(res.data))
    api.get('/admin/pincodes').then((res) => setPincodes(res.data))
    api.get('/admin/rate-cards').then((res) => setRateCards(res.data))
  }

  useEffect(() => { loadAll() }, [])

  const notify = (msg) => { setMessage(msg); setError(''); setTimeout(() => setMessage(''), 3000) }
  const fail = (err, fallback) => { setError(err.response?.data?.detail || fallback); setMessage('') }

  const createZone = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/zones', zoneForm)
      setZoneForm({ name: '', description: '' })
      notify('Zone created')
      loadAll()
    } catch (err) { fail(err, 'Could not create zone') }
  }

  const createPincode = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/pincodes', { ...pincodeForm, zone_id: parseInt(pincodeForm.zone_id) })
      setPincodeForm({ pincode: '', area_name: '', zone_id: '' })
      notify('Pincode mapped')
      loadAll()
    } catch (err) { fail(err, 'Could not create pincode') }
  }

  const createRateCard = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/rate-cards', {
        ...rateForm,
        zone_id: parseInt(rateForm.zone_id),
        is_intra_zone: rateForm.is_intra_zone === 'true',
        rate_per_kg: parseFloat(rateForm.rate_per_kg),
        cod_surcharge: parseFloat(rateForm.cod_surcharge || 0),
      })
      setRateForm({ zone_id: '', order_type: 'B2C', is_intra_zone: 'true', rate_per_kg: '', cod_surcharge: '' })
      notify('Rate card created')
      loadAll()
    } catch (err) { fail(err, 'Could not create rate card') }
  }

  const createAgent = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/create-agent', agentForm)
      setAgentForm({ name: '', email: '', password: '', phone: '' })
      notify('Agent created')
    } catch (err) { fail(err, 'Could not create agent') }
  }

  const inputCls = "w-full p-2 rounded bg-slate-700 text-white text-sm"

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Admin Setup</h1>
      {message && <p className="text-green-400">{message}</p>}
      {error && <p className="text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-6">
        {/* Zones */}
        <div className="bg-slate-800 p-5 rounded-lg">
          <h2 className="text-white font-bold mb-3">Zones</h2>
          <form onSubmit={createZone} className="space-y-2 mb-4">
            <input placeholder="Zone name" value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              className={inputCls} required />
            <input placeholder="Description" value={zoneForm.description}
              onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
              className={inputCls} />
            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm w-full">Add Zone</button>
          </form>
          <ul className="text-slate-300 text-sm space-y-1">
            {zones.map((z) => <li key={z.id}>#{z.id} — {z.name}</li>)}
          </ul>
        </div>

        {/* Pincodes */}
        <div className="bg-slate-800 p-5 rounded-lg">
          <h2 className="text-white font-bold mb-3">Pincodes</h2>
          <form onSubmit={createPincode} className="space-y-2 mb-4">
            <input placeholder="Pincode" value={pincodeForm.pincode}
              onChange={(e) => setPincodeForm({ ...pincodeForm, pincode: e.target.value })}
              className={inputCls} required />
            <input placeholder="Area name" value={pincodeForm.area_name}
              onChange={(e) => setPincodeForm({ ...pincodeForm, area_name: e.target.value })}
              className={inputCls} />
            <select value={pincodeForm.zone_id}
              onChange={(e) => setPincodeForm({ ...pincodeForm, zone_id: e.target.value })}
              className={inputCls} required>
              <option value="">Select zone</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm w-full">Map Pincode</button>
          </form>
          <ul className="text-slate-300 text-sm space-y-1">
            {pincodes.map((p) => <li key={p.id}>{p.pincode} — zone #{p.zone_id}</li>)}
          </ul>
        </div>

        {/* Rate Cards */}
        <div className="bg-slate-800 p-5 rounded-lg">
          <h2 className="text-white font-bold mb-3">Rate Cards</h2>
          <form onSubmit={createRateCard} className="space-y-2 mb-4">
            <select value={rateForm.zone_id}
              onChange={(e) => setRateForm({ ...rateForm, zone_id: e.target.value })}
              className={inputCls} required>
              <option value="">Select zone</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <select value={rateForm.order_type}
              onChange={(e) => setRateForm({ ...rateForm, order_type: e.target.value })}
              className={inputCls}>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
            <select value={rateForm.is_intra_zone}
              onChange={(e) => setRateForm({ ...rateForm, is_intra_zone: e.target.value })}
              className={inputCls}>
              <option value="true">Intra-zone</option>
              <option value="false">Inter-zone</option>
            </select>
            <input placeholder="Rate per kg" type="number" step="0.01" value={rateForm.rate_per_kg}
              onChange={(e) => setRateForm({ ...rateForm, rate_per_kg: e.target.value })}
              className={inputCls} required />
            <input placeholder="COD surcharge" type="number" step="0.01" value={rateForm.cod_surcharge}
              onChange={(e) => setRateForm({ ...rateForm, cod_surcharge: e.target.value })}
              className={inputCls} />
            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm w-full">Add Rate Card</button>
          </form>
          <ul className="text-slate-300 text-sm space-y-1">
            {rateCards.map((r) => (
              <li key={r.id}>zone #{r.zone_id} · {r.order_type} · {r.is_intra_zone ? 'intra' : 'inter'} · ₹{r.rate_per_kg}/kg</li>
            ))}
          </ul>
        </div>

        {/* Create Agent */}
        <div className="bg-slate-800 p-5 rounded-lg">
          <h2 className="text-white font-bold mb-3">Create Agent</h2>
          <form onSubmit={createAgent} className="space-y-2">
            <input placeholder="Name" value={agentForm.name}
              onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
              className={inputCls} required />
            <input placeholder="Email" type="email" value={agentForm.email}
              onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
              className={inputCls} required />
            <input placeholder="Password" type="password" value={agentForm.password}
              onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
              className={inputCls} required />
            <input placeholder="Phone" value={agentForm.phone}
              onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
              className={inputCls} />
            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm w-full">Create Agent</button>
          </form>
        </div>
      </div>
    </div>
  )
}