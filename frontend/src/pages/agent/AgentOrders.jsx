import { useEffect, useState } from 'react'
import api from '../../api/client'

const nextStatusMap = {
  assigned: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'failed'],
}

const statusColor = {
  pending: 'bg-yellow-600', assigned: 'bg-blue-600', picked_up: 'bg-indigo-600',
  in_transit: 'bg-purple-600', out_for_delivery: 'bg-orange-600',
  delivered: 'bg-green-600', failed: 'bg-red-600',
}

export default function AgentOrders() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  const load = () => {
    api.get('/agent/orders').then((res) => setOrders(res.data))
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (orderId, status) => {
    setError('')
    try {
      await api.patch(`/agent/orders/${orderId}/status`, { status })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update status')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">My Assigned Orders</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {orders.length === 0 && <p className="text-slate-400">No orders assigned yet.</p>}

      <div className="space-y-3">
        {orders.map((order) => {
          const nextOptions = nextStatusMap[order.status] || []
          return (
            <div key={order.id} className="bg-slate-800 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-semibold">Order #{order.id}</p>
                  <p className="text-slate-400 text-sm">{order.pickup_address}</p>
                  <p className="text-slate-400 text-sm">→ {order.drop_address}</p>
                </div>
                <span className={`text-xs text-white px-2 py-1 rounded ${statusColor[order.status] || 'bg-slate-600'}`}>
                  {order.status}
                </span>
              </div>
              {nextOptions.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {nextOptions.map((s) => (
                    <button key={s} onClick={() => updateStatus(order.id, s)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                      Mark {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}