import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import AdminSetup from './AdminSetup'
import AdminOrders from './AdminOrders'

export default function AdminDashboard() {
  const location = useLocation()
  const isSetup = location.pathname === '/admin' || location.pathname === '/admin/'
  const tabCls = (active) =>
    `px-4 py-2 rounded text-sm ${active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="flex gap-3 px-8 pt-6">
        <Link to="/admin" className={tabCls(isSetup)}>Setup</Link>
        <Link to="/admin/orders" className={tabCls(!isSetup)}>Orders</Link>
      </div>
      <Routes>
        <Route path="/" element={<AdminSetup />} />
        <Route path="/orders" element={<AdminOrders />} />
      </Routes>
    </div>
  )
}