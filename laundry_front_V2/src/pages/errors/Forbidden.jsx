import React from 'react'
import { Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
export default function Forbidden() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <Lock size={48} className="text-amber-400" />
      <h1 className="text-2xl font-bold text-[var(--text)]">Accès interdit</h1>
      <p className="text-[var(--text-secondary)]">Vous n'avez pas les droits pour accéder à cette page.</p>
      <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm">Retour</button>
    </div>
  )
}
