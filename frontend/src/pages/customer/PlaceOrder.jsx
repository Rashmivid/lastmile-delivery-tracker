import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

const emptyForm = {
  pickup_address: '', pickup_pincode: '',
  drop_address: '', drop_pincode: '',
  length: '', breadth: '', height: '', actual_weight: '',
  order_type: 'B2C', payment_type: 'prepaid',
}

export default function PlaceOrder() {
  const [form, setForm] = useState(emptyForm)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setPreview(null) // any change invalidates old preview
  }

  const payload = () => ({
    ...form,
    length: parseFloat(form.length),
    breadth: parseFloat(form.breadth),
    height: parseFloat(form.height),
    actual_weight: parseFloat(form.actual_weight),
  })

  const handlePreview = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/orders/preview', payload())
      setPreview(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not calculate charge')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/orders/', payload())
      navigate(`/customer/orders/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not place order')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full p-2 rounded bg-slate-700 text-white"

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Place Order</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      <form onSubmit={handlePreview} className="space-y-4 bg-slate-800 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <input name="pickup_address" placeholder="Pickup Address" value={form.pickup_address}
            onChange={handleChange} className={inputCls} required />
          <input name="pickup_pincode" placeholder="Pickup Pincode" value={form.pickup_pincode}
            onChange={handleChange} className={inputCls} required />
          <input name="drop_address" placeholder="Drop Address" value={form.drop_address}
            onChange={handleChange} className={inputCls} required />
          <input name="drop_pincode" placeholder="Drop Pincode" value={form.drop_pincode}
            onChange={handleChange} className={inputCls} required />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <input name="length" type="number" step="0.01" placeholder="Length (cm)" value={form.length}
            onChange={handleChange} className={inputCls} required />
          <input name="breadth" type="number" step="0.01" placeholder="Breadth (cm)" value={form.breadth}
            onChange={handleChange} className={inputCls} required />
          <input name="height" type="number" step="0.01" placeholder="Height (cm)" value={form.height}
            onChange={handleChange} className={inputCls} required />
          <input name="actual_weight" type="number" step="0.01" placeholder="Weight (kg)" value={form.actual_weight}
            onChange={handleChange} className={inputCls} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <select name="order_type" value={form.order_type} onChange={handleChange} className={inputCls}>
            <option value="B2C">B2C</option>
            <option value="B2B">B2B</option>
          </select>
          <select name="payment_type" value={form.payment_type} onChange={handleChange} className={inputCls}>
            <option value="prepaid">Prepaid</option>
            <option value="cod">COD</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          {loading ? 'Calculating...' : 'Calculate Charge'}
        </button>
      </form>

      {preview && (
        <div className="mt-6 bg-slate-800 p-6 rounded-lg space-y-2">
          <h2 className="text-lg font-bold text-white mb-2">Charge Preview</h2>
          <p className="text-slate-300">Pickup Zone: <span className="text-white">{preview.pickup_zone}</span></p>
          <p className="text-slate-300">Drop Zone: <span className="text-white">{preview.drop_zone}</span></p>
          <p className="text-slate-300">Type: <span className="text-white">{preview.is_intra_zone ? 'Intra-zone' : 'Inter-zone'}</span></p>
          <p className="text-slate-300">Volumetric Weight: <span className="text-white">{preview.volumetric_weight} kg</span></p>
          <p className="text-slate-300">Billed Weight: <span className="text-white">{preview.billed_weight} kg</span></p>
          <p className="text-slate-300">Rate/kg: <span className="text-white">₹{preview.rate_per_kg}</span></p>
          <p className="text-slate-300">Base Charge: <span className="text-white">₹{preview.base_charge}</span></p>
          <p className="text-slate-300">COD Surcharge: <span className="text-white">₹{preview.cod_surcharge}</span></p>
          <p className="text-xl font-bold text-green-400 pt-2">Total: ₹{preview.total_charge}</p>
          <button onClick={handleConfirm} disabled={loading}
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 mt-4">
            {loading ? 'Placing...' : 'Confirm Order'}
          </button>
        </div>
      )}
    </div>
  )
}