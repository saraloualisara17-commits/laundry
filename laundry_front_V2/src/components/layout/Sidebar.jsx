import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  LayoutDashboard, ClipboardList, Users, Package,
  AlertCircle, Settings, LogOut, Bell, Truck,
  RotateCcw, UserCog, Map
} from 'lucide-react'
import { logOut } from '../../store/auth/authSlice'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../services/notificationsApi'
import { queryKeys } from '../../lib/queryKeys'

const NAV = {
  admin: [
    { to: '/admin/dashboard',       icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/admin/commandes',        icon: ClipboardList,   label: 'Commandes' },
    { to: '/admin/clients',          icon: Users,           label: 'Clients' },
    { to: '/admin/catalog',          icon: Package,         label: 'Catalogue' },
    { to: '/admin/unpaid',           icon: AlertCircle,     label: 'Impayés' },
    { to: '/admin/users-management', icon: UserCog,         label: 'Équipe' },
    { to: '/admin/settings',         icon: Settings,        label: 'Paramètres' },
  ],
  employe: [
    { to: '/employe/dashboard',  icon: LayoutDashboard, label: 'Atelier' },
    { to: '/employe/commandes',  icon: ClipboardList,   label: 'Commandes' },
    { to: '/employe/clients',    icon: Users,           label: 'Clients' },
    { to: '/employe/retours',    icon: RotateCcw,       label: 'Retours' },
  ],
  livreur: [
    { to: '/livreur',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/livreur/delivery',  icon: Truck,           label: 'Livraisons' },
    { to: '/livreur/canceled',  icon: RotateCcw,       label: 'Annulées' },
    { to: '/livreur/map',       icon: Map,             label: 'Carte' },
  ],
}

export default function Sidebar() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const user      = useSelector(s => s.auth.user)
  const role      = user?.role?.toLowerCase()
  const items     = NAV[role] || []

  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsApi.getUnreadCount,
    select: (d) => typeof d === 'number' ? d : (d?.count ?? 0),
  })

  const handleLogout = () => {
    dispatch(logOut())
    navigate('/')
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-[rgba(0,0,0,0.06)] shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-[rgba(0,0,0,0.06)]">
        <span className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold text-[var(--primary)] tracking-tight">
          PureClean
        </span>
        <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mt-0.5 capitalize">{role}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/livreur'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                isActive
                  ? 'bg-[var(--primary-surface)] text-[var(--primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Notifications — all roles */}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              isActive
                ? 'bg-[var(--primary-surface)] text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
            }`
          }
        >
          <Bell size={18} />
          <span className="flex-1">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white text-[13px] font-bold flex items-center justify-center">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[var(--text)] truncate">{user?.name || user?.email}</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </aside>
  )
}
