import Navbar from '../../components/Navbar'
import AgentOrders from './AgentOrders'

export default function AgentDashboard() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <AgentOrders />
    </div>
  )
}