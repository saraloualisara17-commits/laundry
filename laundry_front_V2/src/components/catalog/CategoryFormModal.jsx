import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Image as ImageIcon, Camera, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as catalogApi from '../../api/catalog';

const CategoryFormModal = ({ isOpen, onClose, onSave, category = null, loading = false }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    nomAr: '',
    nomFr: '',
    icon: '🧺',
    imageUrl: '',
    description: '',
    sortOrder: 0
  });

  const icons = ['🧺', '🪣', '🛋️', '👕', '🛏️', '🪟', '🧸', '📦'];

  useEffect(() => {
    if (category) {
      setFormData({
        nom: category.nom || '',
        nomAr: category.nomAr || '',
        nomFr: category.nomFr || '',
        icon: category.icon || '🧺',
        imageUrl: category.imageUrl || '',
        description: category.description || '',
        sortOrder: category.sortOrder || 0
      });
    } else {
      setFormData({
        nom: '',
        nomAr: '',
        nomFr: '',
        icon: '🧺',
        imageUrl: '',
        description: '',
        sortOrder: 0
      });
    }
  }, [category, isOpen]);

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[20px] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <h2 className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold text-[var(--text)]">
            {category ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg)] rounded-full transition-colors">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Image Upload */}
          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Image de la catégorie
            </label>
            <div className="relative h-40 w-full bg-[var(--bg)] rounded-xl border-2 border-dashed border-[rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden group">
              {formData.imageUrl ? (
                <>
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL || ''}${formData.imageUrl}`} 
                    className="w-full h-full object-cover"
                    alt="Category"
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
              Nom (obligatoire)
            </label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all"
              placeholder="Ex: Tapis, Couvertures..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Nom Arabe
              </label>
              <input
                type="text"
                value={formData.nomAr}
                onChange={(e) => setFormData({ ...formData, nomAr: e.target.value })}
                className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] text-right focus:outline-none focus:border-[var(--primary)] transition-all"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Nom Français
              </label>
              <input
                type="text"
                value={formData.nomFr}
                onChange={(e) => setFormData({ ...formData, nomFr: e.target.value })}
                className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Icône (si pas d'image)
            </label>
            <div className="grid grid-cols-8 gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`h-10 rounded-[10px] flex items-center justify-center text-[20px] border transition-all ${
                    formData.icon === icon ? 'border-[var(--primary)] bg-[var(--primary-surface)]' : 'border-[rgba(0,0,0,0.08)] hover:bg-[var(--bg)]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all h-24 resize-none"
            />
          </div>

          <div>
            <label className="block font-['Inter'] text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-24 bg-[var(--bg)] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
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

export default CategoryFormModal;
