import React from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LayoutDashboard, ClipboardList, Users, Bell, Truck, RotateCcw, Package, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../services/notificationsApi'
import { queryKeys } from '../../lib/queryKeys'

const NAV = {
  admin: [
    { to: '/admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/commandes',  icon: ClipboardList,   label: 'Commandes' },
    { to: '/admin/clients',    icon: Users,           label: 'Clients' },
    { to: '/notifications',    icon: Bell,            label: 'Notifs', badge: true },
  ],
  employe: [
    { to: '/employe/dashboard', icon: LayoutDashboard, label: 'Atelier' },
    { to: '/employe/commandes', icon: ClipboardList,   label: 'Commandes' },
    { to: '/employe/clients',   icon: Users,           label: 'Clients' },
    { to: '/notifications',     icon: Bell,            label: 'Notifs', badge: true },
  ],
  livreur: [
    { to: '/livreur',          icon: LayoutDashboard, label: 'Home' },
    { to: '/livreur/delivery', icon: Truck,           label: 'Missions' },
    { to: '/livreur/canceled', icon: RotateCcw,       label: 'Annulées' },
    { to: '/notifications',    icon: Bell,            label: 'Notifs', badge: true },
  ],
}

export default function BottomNav() {
  const user  = useSelector(s => s.auth.user)
  const role  = user?.role?.toLowerCase()
  const items = NAV[role] || []

  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsApi.getUnreadCount,
    select: (d) => typeof d === 'number' ? d : (d?.count ?? 0),
  })

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[rgba(0,0,0,0.08)] flex">
      {items.map(({ to, icon: Icon, label, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/livreur'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors relative ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <div className="relative">
            <Icon size={20} />
            {badge && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
