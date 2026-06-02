import React from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ isOpen, onClose, onConfirm, loading, title, message, confirmText = 'Confirmer', cancelText = 'Annuler', type = 'danger' }) {
  if (!isOpen) return null
  const isDanger = type === 'danger'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${isDanger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <AlertTriangle size={24} className={isDanger ? 'text-red-500' : 'text-amber-500'} />
        </div>
        <h3 className="text-center font-bold text-[var(--text)] text-lg mb-2">{title}</h3>
        {message && <p className="text-center text-sm text-[var(--text-secondary)] mb-6">{message}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-colors">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'} disabled:opacity-50`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
