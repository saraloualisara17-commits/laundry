import React, { useEffect, useState, useRef } from 'react';
import { Settings, Loader2, Upload, Image, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { getSettings, updateSettings, uploadFile } from '../../store/admin/adminService';

const BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

export default function SettingsPage() {
  const [appName, setAppName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [newLogoPreview, setNewLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getSettings()
      .then(res => {
        setAppName(res.data.appName || '');
        setBusinessPhone(res.data.businessPhone || '');
        setLogoUrl(res.data.logoUrl || '');
      })
      .catch(() => toast.error('Erreur lors du chargement des paramètres'))
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewLogoFile(file);
    setNewLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!appName.trim()) { toast.error("Le nom de l'application est requis"); return; }
    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;
      if (newLogoFile) {
        const uploadRes = await uploadFile(newLogoFile);
        finalLogoUrl = uploadRes.data.filename || uploadRes.data;
      }
      await updateSettings({ appName: appName.trim(), businessPhone: businessPhone.trim(), logoUrl: finalLogoUrl });
      setLogoUrl(finalLogoUrl);
      setNewLogoFile(null);
      setNewLogoPreview(null);
      toast.success('Paramètres sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const currentLogo = newLogoPreview || (logoUrl ? `${BASE_URL}/uploads/${logoUrl}` : null);

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div>
        <h1 className="font-bold text-2xl text-[var(--text)] flex items-center gap-2">
          <Settings size={24} className="text-[var(--primary)]" /> Paramètres
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Configuration générale de l'application</p>
      </div>

      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 shadow-sm space-y-5">
        {/* Logo */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text)] mb-3">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[rgba(0,0,0,0.15)] flex items-center justify-center overflow-hidden bg-[var(--bg)]">
              {currentLogo ? (
                <img src={currentLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Image size={24} className="text-[var(--text-secondary)] opacity-40" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-colors"
            >
              <Upload size={15} /> Changer le logo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          {newLogoFile && <p className="text-xs text-[var(--primary)] mt-2">{newLogoFile.name} sélectionné</p>}
        </div>

        {/* App name */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text)] mb-1">
            Nom de l'application <span className="text-red-500">*</span>
          </label>
          <input
            type="text" value={appName} onChange={e => setAppName(e.target.value)}
            placeholder="Ex: Astra Pro"
            className="w-full px-3 py-2.5 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Business phone */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text)] mb-1">Téléphone professionnel</label>
          <input
            type="tel" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)}
            placeholder="Ex: +212 6XX XX XX XX"
            className="w-full px-3 py-2.5 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <button
          onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Sauvegarder
        </button>
      </div>
    </div>
  );
}
