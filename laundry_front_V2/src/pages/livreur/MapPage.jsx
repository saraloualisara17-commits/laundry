import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, MapPin, X, Navigation2, ChevronRight } from 'lucide-react';
import { fetchReadyForDelivery, fetchPendingPickup } from '../../store/livreur/livreurThunk';
import { STATUS_COLORS } from '../../constants/statusColors';

const MAP_CENTER = { lat: 33.5731, lng: -7.5898 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const resolveCoords = (order) => {
  if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
    return { lat: parseFloat(order.deliveryLatitude), lng: parseFloat(order.deliveryLongitude) };
  }
  const addr = order.client?.addresses?.[0];
  if (addr?.latitude && addr?.longitude) {
    return { lat: parseFloat(addr.latitude), lng: parseFloat(addr.longitude) };
  }
  return null;
};

const makeIcon = (color) => ({
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  fillColor: color,
  fillOpacity: 1,
  strokeWeight: 1,
  strokeColor: '#fff',
  scale: 1.5,
  anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(12, 22) : { x: 12, y: 22 },
});

const FILTER_OPTIONS = [
  { key: 'all', label: 'Tout' },
  { key: 'deliveries', label: 'Livraisons' },
  { key: 'pickups', label: 'Collectes' },
];

export default function MapPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const { readyForDelivery = [], pendingPickup = [], loading: livreurLoading } = useSelector(s => s.livreur);
  const loading = livreurLoading?.readyForDelivery || false;

  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    dispatch(fetchReadyForDelivery());
    dispatch(fetchPendingPickup());
  }, [dispatch]);

  const deliveryMarkers = (readyForDelivery || [])
    .map(o => ({ ...o, coords: resolveCoords(o), type: 'delivery' }))
    .filter(o => o.coords);

  const pickupMarkers = (pendingPickup || [])
    .map(o => ({ ...o, coords: resolveCoords(o), type: 'pickup' }))
    .filter(o => o.coords);

  const visibleMarkers = filter === 'deliveries' ? deliveryMarkers
    : filter === 'pickups' ? pickupMarkers
    : [...deliveryMarkers, ...pickupMarkers];

  const hasAnyGps = visibleMarkers.length > 0;

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <MapPin size={40} className="text-red-400" />
        <p className="text-[var(--text-secondary)]">Impossible de charger Google Maps</p>
        <p className="text-xs text-[var(--text-secondary)]">Vérifiez votre clé API dans le fichier .env</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -mx-5 -my-6 mt-0">
      {/* Filter pills */}
      <div className="flex gap-2 p-4 bg-white border-b border-[rgba(0,0,0,0.06)] flex-shrink-0">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === opt.key ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)]'}`}
          >
            {opt.label}
            {opt.key === 'deliveries' && ` (${deliveryMarkers.length})`}
            {opt.key === 'pickups' && ` (${pickupMarkers.length})`}
          </button>
        ))}
        {loading && <Loader2 size={16} className="animate-spin text-[var(--primary)] ms-2 self-center" />}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={MAP_CENTER}
            zoom={12}
            options={{ disableDefaultUI: false, zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            onClick={() => setSelectedOrder(null)}
          >
            {visibleMarkers.map(order => (
              <Marker
                key={order.id}
                position={order.coords}
                icon={makeIcon(order.type === 'delivery' ? STATUS_COLORS.READY_FOR_DELIVERY : STATUS_COLORS.PENDING_PICKUP)}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </GoogleMap>
        )}

        {/* Empty state overlay */}
        {isLoaded && !hasAnyGps && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-lg p-6 mx-4 text-center">
              <MapPin size={32} className="text-[var(--text-secondary)] mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-[var(--text)]">Aucune commande géolocalisée</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Les commandes sans coordonnées GPS n'apparaissent pas sur la carte</p>
            </div>
          </div>
        )}

        {/* Selected order info card */}
        {selectedOrder && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-white rounded-2xl shadow-xl border border-[rgba(0,0,0,0.06)] p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: selectedOrder.type === 'delivery' ? STATUS_COLORS.READY_FOR_DELIVERY : STATUS_COLORS.PENDING_PICKUP }} />
                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                      {selectedOrder.type === 'delivery' ? 'Livraison' : 'Collecte'}
                    </span>
                  </div>
                  <p className="font-bold text-[var(--text)] mt-1">{selectedOrder.client?.name || '—'}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{selectedOrder.numeroCommande}</p>
                  {selectedOrder.client?.addresses?.[0]?.address && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                      <MapPin size={11} /> {selectedOrder.client.addresses[0].address}
                    </p>
                  )}
                  {selectedOrder.type === 'delivery' && selectedOrder.montantTotal > 0 && (
                    <p className="text-sm font-semibold text-[var(--text)] mt-1">
                      {Number(selectedOrder.montantTotal).toFixed(2)} MAD
                    </p>
                  )}
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg hover:bg-[var(--bg)]">
                  <X size={16} className="text-[var(--text-secondary)]" />
                </button>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.coords.lat},${selectedOrder.coords.lng}`}
                  target="_blank" rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold"
                >
                  <Navigation2 size={14} /> Naviguer
                </a>
                <button
                  onClick={() => navigate(`/orders/${selectedOrder.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                >
                  Voir détail <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
