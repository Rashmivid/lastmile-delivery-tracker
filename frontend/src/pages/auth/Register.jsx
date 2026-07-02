import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(form.name, form.email, form.password, form.phone)
      navigate('/customer')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-lg w-96 space-y-4">
        <h1 className="text-2xl font-bold text-white">Register</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange}
          className="w-full p-2 rounded bg-slate-700 text-white" required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange}
          className="w-full p-2 rounded bg-slate-700 text-white" required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange}
          className="w-full p-2 rounded bg-slate-700 text-white" required />
        <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange}
          className="w-full p-2 rounded bg-slate-700 text-white" />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Register
        </button>
        <p className="text-slate-400 text-sm">
          Have an account? <Link to="/login" className="text-blue-400">Login</Link>
        </p>
      </form>
    </div>
  )
}