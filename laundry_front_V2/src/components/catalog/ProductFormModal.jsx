import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Square, Hash, Scale, Ruler, Edit3, Image as ImageIcon, Camera, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as catalogApi from '../../api/catalog';

const ProductFormModal = ({ isOpen, onClose, onSave, product = null, loading = false }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    pricingMethod: 'PER_UNIT',
    prixUnitaire: '',
    uniteLabel: 'pièce',
    imageUrl: '',
    processingDays: 2,
    requiresDimensions: false,
    sortOrder: 0
  });

  const PRICING_METHODS = [
    { id: 'PER_M2', label: "Par m²", sub: "Tapis, rideaux, moquette", icon: Square, color: 'text-teal-500', bg: 'bg-teal-50' },
    { id: 'PER_UNIT', label: "À l'unité", sub: "Couvertures, vêtements", icon: Hash, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'PER_KG', label: "Au kg", sub: "Linge en vrac", icon: Scale, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'PER_LINEAR_M', label: "Au mètre", sub: "Rideaux longs", icon: Ruler, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'CUSTOM', label: "Prix libre", sub: "Saisi manuellement", icon: Edit3, color: 'text-gray-500', bg: 'bg-gray-50' }
  ];

  useEffect(() => {
    if (product) {
      setFormData({
        nom: product.nom || '',
        description: product.description || '',
        pricingMethod: product.pricingMethod || 'PER_UNIT',
        prixUnitaire: product.prixUnitaire || '',
        uniteLabel: product.uniteLabel || 'pièce',
        imageUrl: product.imageUrl || '',
        processingDays: product.processingDays || 2,
        requiresDimensions: product.requiresDimensions || false,
        sortOrder: product.sortOrder || 0
      });
    } else {
      setFormData({
        nom: '',
        description: '',
        pricingMethod: 'PER_UNIT',
        prixUnitaire: '',
        uniteLabel: 'pièce',
        imageUrl: '',
        processingDays: 2,
        requiresDimensions: false,
        sortOrder: 0
      });
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const res = await catalogApi.uploadFiles(files);
      if (res.data && res.data.length > 0) {
        setFormData({ ...formData, imageUrl: res.data[0] });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectedMethod = PRICING_METHODS.find(m => m.id === formData.pricingMethod);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[20px] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between shrink-0">
          <h2 className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold text-[var(--text)]">
            {product ? "Modifier le produit" : "Nouveau produit"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg)] rounded-full transition-colors">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Image Upload */}
          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Image du produit
            </label>
            <div className="relative h-40 w-full bg-[var(--bg)] rounded-xl border-2 border-dashed border-[rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden group">
              {formData.imageUrl ? (
                <>
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL || ''}${formData.imageUrl}`} 
                    className="w-full h-full object-cover"
                    alt="Product"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=Erreur+image'; }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white rounded-full text-[var(--primary)] hover:scale-110 transition-transform"
                    >
                      <Camera size={20} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="p-2 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex flex-col items-center gap-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin" size={32} />
                  ) : (
                    <>
                      <ImageIcon size={32} />
                      <span className="text-[12px] font-bold uppercase tracking-wider">Ajouter une image</span>
                    </>
                  )}
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          </div>

          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Nom du produit
            </label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all"
              placeholder="Ex: Couverture 2 places..."
            />
          </div>

          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all h-20 resize-none"
            />
          </div>

          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Méthode de tarification
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRICING_METHODS.map((method) => {
                const Icon = method.icon;
                const active = formData.pricingMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      pricingMethod: method.id,
                      requiresDimensions: method.id === 'PER_M2'
                    })}
                    className={`flex flex-col items-start p-3 rounded-[14px] border transition-all text-left ${
                      active ? 'border-[var(--primary)] bg-[var(--primary-surface)] ring-2 ring-[rgba(13,115,119,0.1)]' : 'border-[rgba(0,0,0,0.08)] hover:bg-[var(--bg)]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${method.bg} ${method.color} flex items-center justify-center mb-2`}>
                      <Icon size={18} />
                    </div>
                    <p className="font-['Inter'] text-[13px] font-bold text-[var(--text)]">{method.label}</p>
                    <p className="font-['Inter'] text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{method.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {formData.pricingMethod !== 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  {formData.pricingMethod === 'PER_M2' ? "Prix par m² (DH)" :
                   formData.pricingMethod === 'PER_KG' ? "Prix par kg (DH)" :
                   formData.pricingMethod === 'PER_LINEAR_M' ? "Prix par mètre (DH)" :
                   "Prix unitaire (DH)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.prixUnitaire}
                  onChange={(e) => setFormData({ ...formData, prixUnitaire: e.target.value })}
                  className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all"
                />
              </div>

              {formData.pricingMethod === 'PER_UNIT' && (
                <div>
                  <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Libellé de l'unité
                  </label>
                  <input
                    type="text"
                    value={formData.uniteLabel}
                    onChange={(e) => setFormData({ ...formData, uniteLabel: e.target.value })}
                    className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all"
                    placeholder="pièce, lot, sac..."
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Délai de traitement (jours)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, processingDays: Math.max(1, prev.processingDays - 1) }))}
                  className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[var(--text)] hover:bg-white transition-all"
                >-</button>
                <input
                  type="number"
                  value={formData.processingDays}
                  readOnly
                  className="w-16 bg-transparent text-center font-bold text-[16px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, processingDays: Math.min(30, prev.processingDays + 1) }))}
                  className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[var(--text)] hover:bg-white transition-all"
                >+</button>
              </div>
            </div>

            {formData.pricingMethod === 'PER_M2' && (
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative w-10 h-6">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.requiresDimensions}
                      onChange={(e) => setFormData({ ...formData, requiresDimensions: e.target.checked })}
                    />
                    <div className="w-10 h-6 bg-[rgba(0,0,0,0.08)] rounded-full peer peer-checked:bg-[var(--primary)] transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:after:translate-x-4 shadow-inner"></div>
                  </div>
                  <span className="font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Dimensions L×H</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--bg)] border border-[rgba(0,0,0,0.06)] text-[var(--text-secondary)] rounded-[12px] py-3 text-[14px] font-bold uppercase tracking-wider transition-all hover:bg-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || isUploading}
              className="flex-[2] bg-[var(--primary)] text-white rounded-[12px] py-3 text-[14px] font-bold uppercase tracking-wider transition-all shadow-[var(--shadow-teal)] active:scale-95 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ProductFormModal;
