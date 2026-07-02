import { Routes, Route } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import PlaceOrder from './PlaceOrder'
import OrderList from './OrderList'
import OrderDetail from './OrderDetail'

export default function CustomerDashboard() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<OrderList />} />
        <Route path="/place-order" element={<PlaceOrder />} />
        <Route path="/orders/:orderId" element={<OrderDetail />} />
      </Routes>
    </div>
  )
}