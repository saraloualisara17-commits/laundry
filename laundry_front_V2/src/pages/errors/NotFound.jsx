import React from 'react'
import { useNavigate } from 'react-router-dom'
export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-8xl font-black text-[var(--primary)] opacity-20">404</p>
      <h1 className="text-2xl font-bold text-[var(--text)]">Page introuvable</h1>
      <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm">Retour</button>
    </div>
  )
}
