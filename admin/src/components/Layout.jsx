import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { to: '/',                 label: 'Dashboard',       icon: '🏠' },
  { to: '/pending',          label: 'Pending Queue',   icon: '⏳' },
  { to: '/listings',         label: 'All Listings',    icon: '📋' },
  { to: '/messages-review',  label: 'Message Review',  icon: '💬' },
  { to: '/keywords',         label: 'Blocked Words',   icon: '🚫' },
  { to: '/users',            label: 'Users',           icon: '👥' },
  { to: '/logs',             label: 'Activity Log',    icon: '📜' },
];

export default function Layout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-slate-900 text-slate-100">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-lg font-bold tracking-tight">Talash Admin</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {profile?.full_name || 'Admin'}
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="m-3 rounded-md bg-slate-800 hover:bg-slate-700 text-sm py-2 transition"
        >
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-slate-900 text-slate-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-bold">Talash Admin</div>
          <button onClick={signOut} className="text-xs text-slate-300">Sign out</button>
        </div>
        <nav className="flex overflow-x-auto px-2 pb-2 gap-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-xs ${
                  isActive ? 'bg-slate-700 text-white' : 'text-slate-300'
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-24 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
