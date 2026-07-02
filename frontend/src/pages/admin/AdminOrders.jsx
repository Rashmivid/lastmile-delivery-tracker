import { useEffect, useState } from 'react'
import api from '../../api/client'

const statusOptions = ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'rescheduled']

const statusColor = {
  pending: 'bg-yellow-600', assigned: 'bg-blue-600', picked_up: 'bg-indigo-600',
  in_transit: 'bg-purple-600', out_for_delivery: 'bg-orange-600',
  delivered: 'bg-green-600', failed: 'bg-red-600', rescheduled: 'bg-slate-600',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [zones, setZones] = useState([])
  const [filters, setFilters] = useState({ status: '', zone_id: '', agent_id: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [assignAgentId, setAssignAgentId] = useState({})
  const [overrideStatus, setOverrideStatus] = useState({})

  const notify = (msg) => { setMessage(msg); setError(''); setTimeout(() => setMessage(''), 3000) }
  const fail = (err, fallback) => { setError(err.response?.data?.detail || fallback); setMessage('') }

  const loadOrders = () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.zone_id) params.zone_id = filters.zone_id
    if (filters.agent_id) params.agent_id = filters.agent_id
    api.get('/admin/orders', { params })
      .then((res) => setOrders(res.data))
      .catch((err) => fail(err, 'Could not load orders'))
  }

  useEffect(() => {
    api.get('/admin/zones').then((res) => setZones(res.data))
    loadOrders()
  }, [])

  const applyFilters = (e) => { e.preventDefault(); loadOrders() }

  const handleAssign = async (orderId) => {
    const agentId = assignAgentId[orderId]
    if (!agentId) return fail({ response: {} }, 'Enter an agent ID first')
    try {
      await api.patch(`/admin/orders/${orderId}/assign?agent_id=${agentId}`)
      notify(`Order #${orderId} assigned`)
      loadOrders()
    } catch (err) { fail(err, 'Could not assign agent') }
  }

  const handleAutoAssign = async (orderId) => {
    try {
      await api.patch(`/admin/orders/${orderId}/auto-assign`)
      notify(`Order #${orderId} auto-assigned`)
      loadOrders()
    } catch (err) { fail(err, 'Could not auto-assign') }
  }

  const handleOverride = async (orderId) => {
    const status = overrideStatus[orderId]
    if (!status) return fail({ response: {} }, 'Select a status first')
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status })
      notify(`Order #${orderId} status overridden`)
      loadOrders()
    } catch (err) { fail(err, 'Could not override status') }
  }

  const inputCls = "p-2 rounded bg-slate-700 text-white text-sm"

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-4">All Orders</h1>
      {message && <p className="text-green-400 mb-3">{message}</p>}
      {error && <p className="text-red-400 mb-3">{error}</p>}

      <form onSubmit={applyFilters} className="flex gap-3 mb-6 bg-slate-800 p-4 rounded-lg">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={inputCls}>
          <option value="">All statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.zone_id} onChange={(e) => setFilters({ ...filters, zone_id: e.target.value })} className={inputCls}>
          <option value="">All zones</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <input placeholder="Agent ID" value={filters.agent_id}
          onChange={(e) => setFilters({ ...filters, agent_id: e.target.value })} className={inputCls} />
        <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm">Filter</button>
      </form>

      <div className="space-y-3">
        {orders.length === 0 && <p className="text-slate-400">No orders match.</p>}
        {orders.map((order) => (
          <div key={order.id} className="bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-white font-semibold">Order #{order.id} — customer #{order.customer_id}</p>
                <p className="text-slate-400 text-sm">{order.pickup_pincode} → {order.drop_pincode}</p>
                <p className="text-slate-400 text-sm">Agent: {order.agent_id ?? 'unassigned'} · ₹{order.charge}</p>
              </div>
              <span className={`text-xs text-white px-2 py-1 rounded ${statusColor[order.status] || 'bg-slate-600'}`}>
                {order.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input placeholder="Agent ID" type="number"
                value={assignAgentId[order.id] || ''}
                onChange={(e) => setAssignAgentId({ ...assignAgentId, [order.id]: e.target.value })}
                className="w-24 p-1 rounded bg-slate-700 text-white text-sm" />
              <button onClick={() => handleAssign(order.id)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                Assign
              </button>
              <button onClick={() => handleAutoAssign(order.id)}
                className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
                Auto-assign
              </button>

              <select value={overrideStatus[order.id] || ''}
                onChange={(e) => setOverrideStatus({ ...overrideStatus, [order.id]: e.target.value })}
                className="p-1 rounded bg-slate-700 text-white text-sm">
                <option value="">Override status...</option>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => handleOverride(order.id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                Override
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}