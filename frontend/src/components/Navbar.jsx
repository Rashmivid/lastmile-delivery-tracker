import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-slate-800 px-6 py-4 flex justify-between items-center">
      <span className="text-white font-bold">LastMile Tracker</span>
      <div className="flex items-center gap-4">
        <span className="text-slate-300 text-sm">{user?.name} ({user?.role})</span>
        <button onClick={handleLogout} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
          Logout
        </button>
      </div>
    </nav>
  )
}