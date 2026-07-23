import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, Users, Network, Share2, Router, Receipt, Activity as ActivityIcon, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/devices', label: 'Devices', icon: Router },
  { to: '/topology', label: 'Topology', icon: Share2 },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/subnets', label: 'Subnets', icon: Network },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/activity', label: 'Activity', icon: ActivityIcon },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-ink-800 text-mist-50'
            : 'text-mist-400 hover:text-mist-50 hover:bg-ink-900'
        }`
      }
    >
      <Icon size={17} strokeWidth={1.75} />
      {label}
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
    <div className="min-h-screen bg-ink-950 flex">
      <aside className="w-60 shrink-0 border-r border-ink-700 flex flex-col">
        <div className="px-5 py-5 border-b border-ink-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-signal" />
            <span className="font-display text-mist-50 font-semibold tracking-tight">Tuwa</span>
            <span className="font-mono text-mist-400 text-xs uppercase tracking-widest">NOC</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavItem key={to} to={to} label={label} Icon={icon} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-ink-700">
          <p className="px-3 text-mist-400 text-xs font-mono truncate mb-2">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-mist-400 hover:text-mist-50 hover:bg-ink-900 transition-colors"
          >
            <LogOut size={17} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8 max-w-7xl">{children}</main>
    </div>
  );
}
