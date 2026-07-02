import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

const statusColor = {
  pending: 'bg-yellow-600', assigned: 'bg-blue-600', picked_up: 'bg-indigo-600',
  in_transit: 'bg-purple-600', out_for_delivery: 'bg-orange-600',
  delivered: 'bg-green-600', failed: 'bg-red-600', rescheduled: 'bg-slate-600',
}

export default function OrderList() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/orders/')
      .then((res) => setOrders(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load orders'))
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">My Orders</h1>
        <Link to="/customer/place-order" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + New Order
        </Link>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      {orders.length === 0 && !error && <p className="text-slate-400">No orders yet.</p>}

      <div className="space-y-3">
        {orders.map((order) => (
          <Link to={`/customer/orders/${order.id}`} key={order.id}
            className="block bg-slate-800 p-4 rounded-lg hover:bg-slate-700">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white font-semibold">Order #{order.id}</p>
                <p className="text-slate-400 text-sm">{order.pickup_pincode} → {order.drop_pincode}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs text-white px-2 py-1 rounded ${statusColor[order.status] || 'bg-slate-600'}`}>
                  {order.status}
                </span>
                <p className="text-white mt-1">₹{order.charge}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}