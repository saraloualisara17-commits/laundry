import React from 'react'
import { ShieldOff } from 'lucide-react'
export default function SuspendedAccount() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <ShieldOff size={48} className="text-red-400" />
      <h1 className="text-2xl font-bold text-[var(--text)]">Compte suspendu</h1>
      <p className="text-[var(--text-secondary)] max-w-sm">Votre compte a été désactivé. Contactez l'administrateur.</p>
    </div>
  )
}
