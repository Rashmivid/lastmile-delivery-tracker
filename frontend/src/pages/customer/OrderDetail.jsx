import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/client'

export default function OrderDetail() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [tracking, setTracking] = useState([])
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = () => {
    api.get(`/orders/${orderId}`).then((res) => setOrder(res.data))
    api.get(`/orders/${orderId}/tracking`).then((res) => setTracking(res.data))
  }

  useEffect(() => { load() }, [orderId])

  const handleReschedule = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')
    try {
      await api.patch(`/orders/${orderId}/reschedule`, {
        reschedule_date: new Date(rescheduleDate).toISOString(),
      })
      setMessage('Reschedule submitted.')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not reschedule')
    }
  }

  if (!order) return <div className="p-8 text-white">Loading...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-4">Order #{order.id}</h1>

      <div className="bg-slate-800 p-6 rounded-lg space-y-2 mb-6">
        <p className="text-slate-300">Status: <span className="text-white font-semibold">{order.status}</span></p>
        <p className="text-slate-300">From: <span className="text-white">{order.pickup_address} ({order.pickup_pincode})</span></p>
        <p className="text-slate-300">To: <span className="text-white">{order.drop_address} ({order.drop_pincode})</span></p>
        <p className="text-slate-300">Weight: <span className="text-white">{order.billed_weight} kg (billed)</span></p>
        <p className="text-slate-300">Type: <span className="text-white">{order.order_type} / {order.payment_type}</span></p>
        <p className="text-white text-xl font-bold pt-2">₹{order.charge}</p>
      </div>

      {order.status === 'failed' && (
        <form onSubmit={handleReschedule} className="bg-slate-800 p-6 rounded-lg space-y-3 mb-6">
          <h2 className="text-white font-bold">Reschedule Delivery</h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {message && <p className="text-green-400 text-sm">{message}</p>}
          <input type="datetime-local" value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            className="w-full p-2 rounded bg-slate-700 text-white" required />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Submit Reschedule
          </button>
        </form>
      )}

      <div className="bg-slate-800 p-6 rounded-lg">
        <h2 className="text-white font-bold mb-4">Tracking Timeline</h2>
        <div className="space-y-3">
          {tracking.map((t) => (
            <div key={t.id} className="border-l-2 border-blue-500 pl-4">
              <p className="text-white font-semibold">{t.status}</p>
              <p className="text-slate-400 text-sm">{new Date(t.timestamp).toLocaleString()}</p>
              {t.note && <p className="text-slate-400 text-sm">{t.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}