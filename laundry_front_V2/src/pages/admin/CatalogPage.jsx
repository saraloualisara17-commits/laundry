import React, { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ChevronDown,
  ChevronUp, Loader2, X, Package, Tag, Check, Layers
} from 'lucide-react'
import { catalogApi } from '../../services/catalogApi'
import { queryKeys } from '../../lib/queryKeys'
import ConfirmModal from '../../components/ui/ConfirmModal'

const PRICING_METHODS = ['UNITE', 'SURFACE', 'POIDS', 'DIMENSIONS']
const fmt = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })

// ── Category Form Modal ───────────────────────────────────────────────────────
function CategoryModal({ isOpen, onClose, category = null }) {
  const qc     = useQueryClient()
  const isEdit = !!category
  const [form, setForm]   = useState({ nom: '', nomAr: '', icon: '', sortOrder: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm({ nom: category?.nom || '', nomAr: category?.nomAr || '', icon: category?.icon || '', sortOrder: category?.sortOrder ?? 0 })
      setError('')
    }
  }, [isOpen, category])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? catalogApi.updateCategory(category.id, data) : catalogApi.createCategory(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.catalog.categories }); onClose() },
    onError:   (e) => setError(e?.response?.data?.message || 'Erreur'),
  })

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--text)]">{isEdit ? 'Modifier catégorie' : 'Nouvelle catégorie'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          {[
            { key: 'nom',    label: 'Nom (FR)',    placeholder: 'Tapis', required: true },
            { key: 'nomAr',  label: 'Nom (AR)',    placeholder: 'سجادة' },
            { key: 'icon',   label: 'Icône emoji', placeholder: '🪣' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]" />
            </div>
          ))}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Ordre d'affichage</label>
            <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
              className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={mutation.isPending || !form.nom}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductModal({ isOpen, onClose, categoryId, product = null }) {
  const qc     = useQueryClient()
  const isEdit = !!product
  const [form, setForm] = useState({
    nom: '', prixUnitaire: '', pricingMethod: 'UNITE',
    requiresDimensions: false, isActive: true,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm({
        nom:                product?.nom               || '',
        prixUnitaire:       product?.prixUnitaire      ?? '',
        pricingMethod:      product?.pricingMethod     || product?.modeTarification || 'UNITE',
        requiresDimensions: product?.requiresDimensions ?? false,
        isActive:           product?.isActive           ?? true,
      })
      setError('')
    }
  }, [isOpen, product])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? catalogApi.updateProduct(product.id, data) : catalogApi.createProduct(categoryId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.catalog.categories }); onClose() },
    onError:   (e) => setError(e?.response?.data?.message || 'Erreur'),
  })

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--text)]">{isEdit ? 'Modifier produit' : 'Nouveau produit'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, prixUnitaire: parseFloat(form.prixUnitaire) }) }} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Nom du produit</label>
            <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="ex: Tapis standard"
              className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Prix unitaire (DH)</label>
            <input type="number" step="0.01" min="0" value={form.prixUnitaire} onChange={e => setForm(p => ({ ...p, prixUnitaire: e.target.value }))} placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Mode de tarification</label>
            <div className="grid grid-cols-2 gap-2">
              {PRICING_METHODS.map(m => (
                <button key={m} type="button" onClick={() => setForm(p => ({ ...p, pricingMethod: m }))}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.pricingMethod === m ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-[var(--text-secondary)] border-[rgba(0,0,0,0.1)] hover:border-[var(--primary)]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm(p => ({ ...p, requiresDimensions: !p.requiresDimensions }))}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.requiresDimensions ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.requiresDimensions ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-[var(--text-secondary)] font-medium">Dimensions requises</span>
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={mutation.isPending || !form.nom}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Category Card ─────────────────────────────────────────────────────────────
function CategoryCard({ category, onEdit, onDelete }) {
  const qc = useQueryClient()
  const [expanded,   setExpanded]   = useState(false)
  const [showProd,   setShowProd]   = useState(false)
  const [editProd,   setEditProd]   = useState(null)
  const [deleteProd, setDeleteProd] = useState(null)

  const toggleCatMut = useMutation({
    mutationFn: () => catalogApi.toggleCategory(category.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.catalog.categories }),
  })
  const toggleProdMut = useMutation({
    mutationFn: (id) => catalogApi.toggleProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.catalog.categories }),
  })
  const deleteProdMut = useMutation({
    mutationFn: (id) => catalogApi.deleteProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.catalog.categories }); setDeleteProd(null) },
  })

  const products = category.products ?? []
  const active   = products.filter(p => p.isActive).length

  return (
    <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm overflow-hidden">
      {/* Category header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setExpanded(p => !p)} className="flex items-center gap-3 flex-1 text-start">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${category.isActive ? 'bg-[var(--primary-surface)]' : 'bg-gray-100 opacity-50'}`}>
            {category.icon || <Layers size={18} className="text-[var(--primary)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-bold ${category.isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                {category.nom}
              </p>
              {!category.isActive && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400">Inactif</span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{active}/{products.length} produit{products.length !== 1 ? 's' : ''} actif{active !== 1 ? 's' : ''}</p>
          </div>
          {expanded ? <ChevronUp size={16} className="text-[var(--text-muted)] shrink-0" /> : <ChevronDown size={16} className="text-[var(--text-muted)] shrink-0" />}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(category)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors">
            <Edit2 size={12} />
          </button>
          <button onClick={() => toggleCatMut.mutate()} disabled={toggleCatMut.isPending}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${category.isActive ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
            {category.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          </button>
          <button onClick={() => onDelete(category)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-200 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Products list */}
      {expanded && (
        <div className="border-t border-[rgba(0,0,0,0.05)]">
          {products.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucun produit</p>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {products.map(prod => (
                <div key={prod.id} className="flex items-center gap-3 px-5 py-3">
                  <Tag size={13} className={`shrink-0 ${prod.isActive ? 'text-[var(--primary)]' : 'text-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${prod.isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{prod.nom}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{fmt(prod.prixUnitaire)} DH · {prod.pricingMethod || prod.modeTarification}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditProd(prod)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                      <Edit2 size={11} />
                    </button>
                    <button onClick={() => toggleProdMut.mutate(prod.id)}
                      className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${prod.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}>
                      {prod.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    </button>
                    <button onClick={() => setDeleteProd(prod)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { setEditProd(null); setShowProd(true) }}
            className="flex items-center justify-center gap-2 w-full py-3 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-surface)] transition-colors border-t border-[rgba(0,0,0,0.05)]">
            <Plus size={13} />
            Ajouter un produit
          </button>
        </div>
      )}

      <ProductModal isOpen={showProd} onClose={() => setShowProd(false)} categoryId={category.id} />
      <ProductModal isOpen={!!editProd} onClose={() => setEditProd(null)} categoryId={category.id} product={editProd} />
      <ConfirmModal
        isOpen={!!deleteProd} onClose={() => setDeleteProd(null)}
        onConfirm={() => deleteProdMut.mutate(deleteProd?.id)}
        loading={deleteProdMut.isPending}
        title={`Supprimer "${deleteProd?.nom}" ?`} message="Cette action est irréversible." confirmText="Supprimer" type="danger"
      />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const qc = useQueryClient()
  const [showCatForm,  setShowCatForm]  = useState(false)
  const [editCat,      setEditCat]      = useState(null)
  const [deleteCat,    setDeleteCat]    = useState(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn:  catalogApi.getCategories,
  })

  const deleteCatMut = useMutation({
    mutationFn: (id) => catalogApi.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.catalog.categories }); setDeleteCat(null) },
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Catalogue</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{categories.length} catégorie{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditCat(null); setShowCatForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
          <Plus size={15} />
          <span className="hidden sm:inline">Nouvelle catégorie</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm shimmer" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="py-20 text-center opacity-40">
          <Package size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <CategoryCard key={cat.id} category={cat}
              onEdit={(c) => { setEditCat(c); setShowCatForm(true) }}
              onDelete={(c) => setDeleteCat(c)}
            />
          ))}
        </div>
      )}

      <CategoryModal isOpen={showCatForm || !!editCat} onClose={() => { setShowCatForm(false); setEditCat(null) }} category={editCat} />
      <ConfirmModal
        isOpen={!!deleteCat} onClose={() => setDeleteCat(null)}
        onConfirm={() => deleteCatMut.mutate(deleteCat?.id)}
        loading={deleteCatMut.isPending}
        title={`Supprimer "${deleteCat?.nom}" ?`}
        message="Tous les produits de cette catégorie seront supprimés."
        confirmText="Supprimer" type="danger"
      />
    </div>
  )
}
