import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useSelector } from 'react-redux'

export default function Layout() {
  const user = useSelector(s => s.auth.user)
  const isLoggedIn = !!user

  if (!isLoggedIn) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
