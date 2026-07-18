import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm px-3 py-1.5 rounded transition-colors ${
          isActive ? 'bg-ink-800 text-mist-50' : 'text-mist-400 hover:text-mist-50'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-signal" />
            <span className="font-display text-mist-50 font-semibold tracking-tight">Tuwa</span>
            <span className="font-mono text-mist-400 text-xs uppercase tracking-widest">NOC</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavItem to="/dashboard">Dashboard</NavItem>
            <NavItem to="/customers">Customers</NavItem>
            <NavItem to="/subnets">Subnets</NavItem>
            <NavItem to="/billing">Billing</NavItem>
            <NavItem to="/activity">Activity</NavItem>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-mist-400 text-sm font-mono">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-mist-400 hover:text-mist-50 text-sm border border-ink-700 rounded px-3 py-1.5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
