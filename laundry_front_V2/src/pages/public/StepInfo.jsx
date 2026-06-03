import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const MOROCCO_CENTER = [31.7917, -7.0926];

export const isValidMoroccanPhone = (v) =>
  /^(0[567]\d{8}|\+212[567]\d{8}|212[567]\d{8})$/.test(v.replace(/\s/g, ''));

/* Tracks map center as the pin position */
function DragMarker({ onMove }) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onMove(c.lat, c.lng);
    },
  });
  return null;
}

/* Custom teal pin SVG rendered at center of the map */
function CenterPin() {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -100%)',
      zIndex: 999, pointerEvents: 'none',
    }}>
      <svg width="38" height="50" viewBox="0 0 38 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="19" cy="47" rx="8" ry="3" fill="rgba(13,115,119,0.18)"/>
        <path d="M19 2C10.163 2 3 9.163 3 18c0 11.25 16 30 16 30S35 29.25 35 18C35 9.163 27.837 2 19 2z"
          fill="#0D7377" stroke="white" strokeWidth="2"/>
        <circle cx="19" cy="18" r="6" fill="white" opacity="0.9"/>
        <circle cx="19" cy="18" r="3.5" fill="#0D7377"/>
      </svg>
    </div>
  );
}

export default function StepInfo({ info, setInfo, onNext, onBack }) {
  const { t } = useTranslation();

  const [mapCenter, setMapCenter] = useState(
    info.deliveryLatitude ? [info.deliveryLatitude, info.deliveryLongitude] : MOROCCO_CENTER
  );
  const [pinned,    setPinned]    = useState(!!info.deliveryLatitude);
  const [search,    setSearch]    = useState('');
  const [searching, setSearching] = useState(false);
  const [results,   setResults]   = useState([]);
  const [errors,    setErrors]    = useState({});
  const mapRef = useRef(null);

  const handleMapMove = useCallback((lat, lng) => {
    setMapCenter([lat, lng]);
    setInfo(prev => ({ ...prev, deliveryLatitude: lat, deliveryLongitude: lng }));
    setPinned(true);
  }, [setInfo]);

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setMapCenter([lat, lng]);
      setInfo(prev => ({ ...prev, deliveryLatitude: lat, deliveryLongitude: lng }));
      setPinned(true);
      mapRef.current?.flyTo([lat, lng], 16);
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=4&countrycodes=ma`);
      const data = await res.json();
      setResults(data);
    } catch { setResults([]); }
    finally  { setSearching(false); }
  };

  const selectResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setMapCenter([lat, lng]);
    setInfo(prev => ({ ...prev, deliveryLatitude: lat, deliveryLongitude: lng }));
    setPinned(true);
    mapRef.current?.flyTo([lat, lng], 15);
    setResults([]);
    setSearch(r.display_name.split(',')[0]);
  };

  const validate = () => {
    const e = {};
    if (!info.clientName.trim())  e.clientName  = t('public.error_name_required',  { defaultValue: 'Nom requis' });
    if (!info.clientPhone.trim()) e.clientPhone = t('public.error_phone_required', { defaultValue: 'Téléphone requis' });
    else if (!isValidMoroccanPhone(info.clientPhone)) e.clientPhone = t('public.error_phone_invalid', { defaultValue: 'Numéro invalide (ex: 06 00 00 00 00)' });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-10" dir="ltr">

      {/* ── Title ── */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a2e44] mb-3">
          {t('public.info_title', { defaultValue: 'Delivery Details' })}
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          {t('public.info_subtitle', { defaultValue: 'Please provide your contact information and pinpoint your exact location for a seamless pickup and delivery service.' })}
        </p>
      </div>

      {/* ── Two-column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left: form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">

          {/* Name + Phone row */}
          <div className="grid grid-cols-2 gap-4">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-[#1a2e44] mb-2">
                {t('public.client_name', { defaultValue: 'Full Name' })}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={info.clientName}
                  onChange={e => setInfo(p => ({ ...p, clientName: e.target.value }))}
                  placeholder={t('public.name_placeholder', { defaultValue: 'John Doe' })}
                  className={`w-full pl-9 pr-3 py-3 rounded-xl border text-sm transition-colors
                    focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/10
                    ${errors.clientName ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                />
              </div>
              {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-[#1a2e44] mb-2">
                {t('public.client_phone', { defaultValue: 'Phone Number' })}
              </label>
              <div className={`flex items-center rounded-xl border overflow-hidden transition-colors
                focus-within:border-[#0D7377] focus-within:ring-2 focus-within:ring-[#0D7377]/10
                ${errors.clientPhone ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <span className="px-3 py-3 text-sm font-semibold text-[#1a2e44] border-r border-gray-200 bg-gray-100 flex-shrink-0 select-none">
                  +212
                </span>
                <input
                  type="tel"
                  value={info.clientPhone.replace(/^\+?212/, '').replace(/^0/, '')}
                  onChange={e => setInfo(p => ({ ...p, clientPhone: '+212' + e.target.value.replace(/\D/g, '') }))}
                  placeholder="6 00 00 00 00"
                  className="flex-1 px-3 py-3 text-sm bg-transparent focus:outline-none min-w-0"
                />
              </div>
              {errors.clientPhone && <p className="text-red-500 text-xs mt-1">{errors.clientPhone}</p>}
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-sm font-semibold text-[#1a2e44] mb-2">
              {t('public.client_address', { defaultValue: 'Delivery Address' })}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-400 pointer-events-none">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <input
                type="text"
                value={info.clientAddress}
                onChange={e => setInfo(p => ({ ...p, clientAddress: e.target.value }))}
                placeholder={t('public.address_placeholder', { defaultValue: 'Street name, Apartment, Building...' })}
                className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm
                           focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/10"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-[#1a2e44] mb-2">
              {t('public.notes', { defaultValue: 'Special Notes' })}
              <span className="text-gray-400 font-normal ml-1">
                ({t('public.optional', { defaultValue: 'Optional' })})
              </span>
            </label>
            <textarea
              value={info.notes}
              onChange={e => setInfo(p => ({ ...p, notes: e.target.value }))}
              placeholder={t('public.notes_placeholder', { defaultValue: 'Mention delicate fabrics, gate codes, or specific instructions for the driver...' })}
              rows={4}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none
                         focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/10"
            />
          </div>
        </div>

        {/* Right: map */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">

          {/* Map header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1a2e44]">
              {t('public.pin_location', { defaultValue: 'Pin Your Location' })}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all
              ${pinned ? 'bg-[#e8f5e9] text-[#3DB23D]' : 'bg-gray-100 text-gray-400'}`}>
              {t('public.high_accuracy', { defaultValue: 'High Accuracy' })}
            </span>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('public.search_landmark', { defaultValue: 'Search for nearby landmarks...' })}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm
                         focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/10"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </span>
            )}
          </form>

          {/* Search results */}
          {results.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-md -mt-1 z-10">
              {results.map((r, i) => (
                <button key={i} onClick={() => selectResult(r)}
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors
                             border-b border-gray-50 last:border-0 cursor-pointer">
                  <span className="font-semibold text-[#1a2e44] block">{r.display_name.split(',')[0]}</span>
                  <span className="text-gray-400 truncate block">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                </button>
              ))}
            </div>
          )}

          {/* Map container */}
          <div className="relative rounded-xl overflow-hidden" style={{ height: '280px' }}>
            <MapContainer
              center={mapCenter}
              zoom={pinned ? 15 : 6}
              style={{ width: '100%', height: '100%' }}
              ref={mapRef}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
              <DragMarker onMove={handleMapMove} />
            </MapContainer>

            {/* Center pin overlay */}
            <CenterPin />

            {/* GPS button */}
            <button onClick={handleGPS}
              className="absolute top-3 right-3 z-[999] w-10 h-10 bg-white rounded-xl shadow-md
                         flex items-center justify-center hover:bg-gray-50 cursor-pointer border border-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              </svg>
            </button>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 z-[999] flex flex-col gap-1">
              <button onClick={() => mapRef.current?.zoomIn()}
                className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center
                           hover:bg-gray-50 cursor-pointer border border-gray-100 text-gray-600 text-lg font-bold transition-colors">
                +
              </button>
              <button onClick={() => mapRef.current?.zoomOut()}
                className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center
                           hover:bg-gray-50 cursor-pointer border border-gray-100 text-gray-600 text-lg font-bold transition-colors">
                −
              </button>
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t('public.map_hint', { defaultValue: 'Drag the map to position the pin exactly over your entrance. This helps our driver find you without delay.' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500
                     hover:text-[#1a2e44] transition-colors cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          {t('public.back_to_selection', { defaultValue: 'Back to Selection' })}
        </button>

        <button onClick={handleNext}
          className="flex items-center gap-2 bg-[#1a2e44] text-white
                     px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20
                     hover:bg-[#243d58] active:scale-[0.98] transition-all duration-200 cursor-pointer">
          {t('public.continue_to_review', { defaultValue: 'Continue to Review' })}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
