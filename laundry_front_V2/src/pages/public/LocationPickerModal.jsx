import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix Leaflet marker icons with Vite ──────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl:     markerShadow,
});

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CENTER  = [33.5731, -7.5898]; // Casablanca
const DEFAULT_ZOOM    = 13;
const NOMINATIM       = 'https://nominatim.openstreetmap.org';

// ── Geocoding helpers ────────────────────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(`${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: { 'Accept-Language': 'fr' },
    });
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function searchAddress(query) {
  if (!query || query.length < 3) return [];
  try {
    const res = await fetch(
      `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ma`,
      { headers: { 'Accept-Language': 'fr' } },
    );
    return await res.json();
  } catch {
    return [];
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Flies the map to a new position when `target` changes. */
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 16, { duration: 1.2 });
  }, [target, map]);
  return null;
}

/** Handles click-on-map events. */
function MapClickHandler({ onPick }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const address = await reverseGeocode(lat, lng);
      onPick({ lat, lng, address });
    },
  });
  return null;
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function LocationPickerModal({ onConfirm, onClose, initialLocation }) {
  const initial = initialLocation
    ? [initialLocation.lat, initialLocation.lng]
    : DEFAULT_CENTER;

  const [position, setPosition]         = useState(initial);
  const [address,  setAddress]          = useState(initialLocation?.address || '');
  const [flyTarget, setFlyTarget]       = useState(null);

  // Search state
  const [query,         setQuery]         = useState('');
  const [results,       setResults]       = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError,   setGpsError]   = useState('');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const applyLocation = useCallback(({ lat, lng, address }) => {
    setPosition([lat, lng]);
    setAddress(address);
    setResults([]);
    setQuery('');
    setFlyTarget({ lat, lng });
  }, []);

  // Debounced search
  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(searchTimer.current);
    if (q.length < 3) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      const r = await searchAddress(q);
      setResults(r);
      setSearchLoading(false);
    }, 400);
  };

  const handleSelectResult = (result) => {
    applyLocation({
      lat:     parseFloat(result.lat),
      lng:     parseFloat(result.lon),
      address: result.display_name,
    });
  };

  const handleDragEnd = async (e) => {
    const { lat, lng } = e.target.getLatLng();
    const addr = await reverseGeocode(lat, lng);
    setPosition([lat, lng]);
    setAddress(addr);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Géolocalisation non supportée par votre navigateur.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat  = pos.coords.latitude;
        const lng  = pos.coords.longitude;
        const addr = await reverseGeocode(lat, lng);
        applyLocation({ lat, lng, address: addr });
        setGpsLoading(false);
      },
      () => {
        setGpsError("Impossible d'obtenir votre position. Vérifiez les permissions.");
        setGpsLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* Header */}
      <div className="bg-[#0D7377] px-4 pt-10 pb-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xl hover:bg-white/30 transition-colors"
        >
          ←
        </button>
        <h2 className="text-white font-extrabold text-base">Choisir votre adresse</h2>
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 bg-white shadow-sm flex-shrink-0 relative z-20">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Rechercher une adresse..."
            className="w-full border border-gray-200 rounded-2xl pl-9 pr-4 py-2.5 text-sm
                       focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377]"
          />
          {searchLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">…</span>
          )}
        </div>

        {/* Search results dropdown */}
        {results.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200
                          rounded-2xl shadow-xl overflow-hidden z-30 max-h-56 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectResult(r)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[#f0fdf4]
                           border-b border-gray-100 last:border-0"
              >
                <span className="block truncate font-medium text-gray-800">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS button */}
      <div className="px-4 py-2 bg-white flex-shrink-0 z-10">
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          className="flex items-center gap-2 text-[#0D7377] font-semibold text-sm
                     px-4 py-2 rounded-2xl border border-[#0D7377]
                     hover:bg-[#f0fdf4] transition-colors disabled:opacity-50"
        >
          <span>📍</span>
          {gpsLoading ? 'Localisation en cours…' : 'Utiliser ma position actuelle'}
        </button>
        {gpsError && <p className="text-red-500 text-xs mt-1 ml-1">{gpsError}</p>}
      </div>

      {/* Map — fills all remaining space */}
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={initial}
          zoom={DEFAULT_ZOOM}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          />
          <FlyTo target={flyTarget} />
          <MapClickHandler onPick={applyLocation} />
          <Marker
            position={position}
            draggable
            eventHandlers={{ dragend: handleDragEnd }}
          />
        </MapContainer>

        {/* Hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none
                        bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur">
          Appuyez sur la carte ou déplacez l'épingle
        </div>
      </div>

      {/* Selected address + Confirm */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 flex-shrink-0">
        {address ? (
          <div className="bg-[#f0fdf4] border border-[#3DB23D] rounded-2xl px-4 py-3 mb-3">
            <p className="text-xs text-gray-500 mb-0.5">Adresse sélectionnée</p>
            <p className="text-sm font-semibold text-gray-800 line-clamp-2">{address}</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-3 text-center">
            <p className="text-xs text-gray-400">Aucune adresse sélectionnée — appuyez sur la carte</p>
          </div>
        )}
        <button
          onClick={() => onConfirm({ address, lat: position[0], lng: position[1] })}
          disabled={!address}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all ${
            address
              ? 'bg-[#0D7377] hover:bg-[#0a6366] shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Confirmer cette adresse
        </button>
      </div>

    </div>
  );
}
