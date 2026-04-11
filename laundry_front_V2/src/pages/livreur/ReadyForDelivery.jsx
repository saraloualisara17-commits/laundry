import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MapPin,
  Package,
  Phone,
  Navigation,
  CreditCard,
  Loader2,
  X,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { printReceipt } from '../../utils/printReceipt';
import { removeOrderFromReady } from '../../store/livreur/livreurSlice';
import {
  fetchReadyForDelivery,
  confirmPayment,
  fetchPaymentTypes,
  cancelDelivery
} from '../../store/livreur/livreurThunk';
import {
  selectReadyForDelivery,
  selectLoading,
  selectPaymentTypes
} from '../../store/livreur/livreurSelectors';

// Leaflet Imports
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom styles for Leaflet
const leafletStyles = `
  .leaflet-control-attribution {
    font-size: 9px !important;
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  .livreur-dot-ring {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 20px; height: 20px;
    border-radius: 50%;
    background: rgba(59,130,246,0.35);
    animation: pulse-ring 1.4s ease-out infinite;
  }
  .livreur-dot-core {
    width: 14px; height: 14px;
    background: #3B82F6;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(59,130,246,0.5);
    position: relative; z-index: 1;
  }
`;

const livreurIcon = new L.DivIcon({
  html: `
    <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      <div class="livreur-dot-ring"></div>
      <div class="livreur-dot-core"></div>
    </div>
  `,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Custom orange marker for non-optimized or general use
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Numbered icon for optimized route
const createNumberedIcon = (number) =>
  new L.DivIcon({
    html: `
      <div style="
        background: #F97316;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
      ">${number}</div>
    `,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

const createSelectedIcon = (number) =>
  new L.DivIcon({
    html: `
      <div style="
        background: #F97316;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 800;
        border: 3px solid white;
        box-shadow: 0 0 15px rgba(249, 115, 22, 0.8);
      ">${number || ''}</div>
    `,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

const MapController = ({ markers, selectedOrderId }) => {
  const map = useMap();
  useEffect(() => {
    if (!selectedOrderId) {
        if (markers && markers.length > 0) {
           const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
           map.fitBounds(bounds, { padding: [50, 50], animate: true });
        }
        return;
    }
    const target = markers.find(m => m.orderId === selectedOrderId || m.id === selectedOrderId);
    if (target) {
      map.flyTo([target.lat, target.lng], 17, { animate: true, duration: 1.2 });
    }
  }, [selectedOrderId, markers, map]);
  return null;
};

// ─── Sub-Components ───────────────────

const PaymentModal = ({ isOpen, onClose, onConfirm, order, paymentTypes = [], loading }) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedType(null);
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

      <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-modal overflow-hidden animate-in slide-in-from-bottom duration-300 p-6">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"></div>
        <div className="flex justify-between items-center mb-4 text-start">
          <h3 className="text-lg font-bold text-text-primary tracking-tight">{t('driver.ready_delivery.payment_modal.title')}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        <p className="text-xs text-text-muted mb-6 font-semibold uppercase tracking-wider text-start">
          {t('driver.ready_delivery.payment_modal.order_prefix')} <span className="text-primary-600 font-bold">#{order?.numeroCommande || order?.id}</span>
        </p>

        <div className="space-y-2 mb-6">
          {paymentTypes && paymentTypes.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                  ? 'border-2 border-primary-500 bg-primary-50/50 shadow-sm'
                  : 'border-border hover:border-primary-200 hover:bg-primary-50/30'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-white' : 'border-gray-300 bg-gray-50'}`}>
                  {isSelected && <div className="w-2 h-2 bg-primary-500 rounded-full"></div>}
                </div>
                <span className={`text-sm font-bold tracking-tight transition-colors ${isSelected ? 'text-primary-700' : 'text-text-primary'}`}>{type.label}</span>
              </div>
            );
          })}
          {(!paymentTypes || paymentTypes.length === 0) && (
            <p className="text-xs text-center text-text-muted py-4 font-bold uppercase tracking-widest">
              {t('driver.delivery_details.payment_unavailable')}
            </p>
          )}
        </div>

        <button
          onClick={() => onConfirm(selectedType)}
          disabled={!selectedType || loading}
          className="w-full bg-primary-500 text-white rounded-xl py-4 text-sm font-bold shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2 hover:bg-primary-600 disabled:opacity-50 transition-all active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : t('driver.ready_delivery.payment_modal.confirm_btn')}
        </button>
      </div>
    </div>
  );
};

const DeliveryCard = ({ order, onPay, onCancel, onShowGallery, isOptimized, isSelected, onSelect }) => {
  const { t } = useTranslation();
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const getAllPhotos = (order) => {
    const photos = [];
    const tapisList = order.commandeTapis || [];
    tapisList.forEach(t => {
      const imgs = t.tapisImages || t.images || t.imageUrls || [];
      if (Array.isArray(imgs)) {
        imgs.forEach(img => {
          const url = img.imageUrl || img.url || img.path || (typeof img === 'string' ? img : null);
          if (url) {
            photos.push(url.startsWith('http') ? url : `${baseUrl}${url}`);
          }
        });
      } else if (t.imageUrl) {
        photos.push(t.imageUrl.startsWith('http') ? t.imageUrl : `${baseUrl}${t.imageUrl}`);
      }
    });
    return photos;
  };

  const allPhotos = useMemo(() => getAllPhotos(order), [order]);
  const mainPhoto = allPhotos[0];

  const timeAgo = useMemo(() => {
    const created = new Date(order.dateCreation);
    const now = new Date();
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}j`;
  }, [order.dateCreation]);

  const lat = order.client?.addresses?.[0]?.latitude;
  const lng = order.client?.addresses?.[0]?.longitude;
  const address = order.client?.addresses?.[0]?.address;

  const handleItinerary = (provider) => {
    if (lat && lng) {
      if (provider === 'waze') {
        window.open(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
      } else {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
      }
    } else if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    } else {
      toast.warning(t('driver.ready_delivery.card.no_address_error'));
    }
  };

  return (
    <div 
      className={`relative bg-white rounded-2xl shadow-card overflow-hidden flex flex-col md:flex-row border transition-all animate-in slide-in-from-bottom duration-500 group cursor-pointer ${isSelected ? 'border-primary-500 ring-2 ring-primary-500/10' : 'border-border/60 hover:border-primary-200'}`}
      onClick={() => onSelect(order.id)}
    >

      {/* STOP NUMBER BADGE */}
      {isOptimized && order._stopNumber && (
        <div className="absolute top-3 start-3 z-20 w-8 h-8 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white">
          {order._stopNumber}
        </div>
      )}

      {/* LEFT IMAGE SECTION */}
      <div className="w-full md:w-44 h-48 md:h-auto shrink-0 relative bg-gray-50 overflow-hidden">
        {mainPhoto ? (
          <img
            src={mainPhoto}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
            alt="tapis"
            onClick={(e) => { e.stopPropagation(); onShowGallery(allPhotos, 0); }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-300">
            <Package size={40} strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute bottom-3 end-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-bold border border-white/20">
          {order.montantTotal} DH
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex justify-between items-start gap-3 mb-4 text-start">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary tracking-tight truncate leading-tight">
                #{order.numeroCommande} • {order.client?.nom || order.client?.name || order.client?.fullName || t('driver.create_order.articles.labels.client_fallback', 'Client')}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider border border-teal-100">
                  {t('driver.ready_delivery.card.ready')}
                </span>
                <div className="flex items-center gap-1 text-text-muted">
                  <Clock size={12} />
                  <span className="text-[10px] font-semibold text-text-secondary">{timeAgo}</span>
                </div>
              </div>
            </div>
            {order._legDistance && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 rounded-lg border border-primary-100 shadow-sm">
                  <Navigation size={11} className="text-primary-500 shrink-0 rtl:rotate-180" />
                  <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wide whitespace-nowrap">
                    {order._isFirstStop ? `${order._legDistance} km` : `↳ ${order._legDistance} KM`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50/50 p-4 rounded-xl mb-5 border border-gray-100 text-start">
            <div className="flex items-start gap-3 mb-3">
              <MapPin size={15} className="text-primary-500 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2">{address || t('driver.ready_delivery.card.no_address')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={15} className="text-primary-500 shrink-0 rtl:rotate-180" />
              <a href={`tel:${order.client?.phones?.[0]?.phoneNumber}`} className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors">
                {order.client?.phones?.[0]?.phoneNumber || t('driver.ready_delivery.card.no_phone')}
              </a>
            </div>

            {/* GPS MISSING WARNING */}
            {(!lat || !lng) && (
              <div className="mt-4 flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-amber-700">
                <AlertTriangle size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wide">{t('driver.ready_delivery.card.gps_unavailable')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex-1 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleItinerary('google'); }}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-500/10 active:scale-95"
            >
              <Navigation size={14} fill="white" className="rtl:rotate-180" /> Maps
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleItinerary('waze'); }}
              className={`w-12 bg-white hover:bg-blue-50 text-blue-500 border border-blue-100 rounded-xl py-3.5 flex items-center justify-center transition-all active:scale-95 ${(!lat || !lng) ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <ExternalLink size={18} />
            </button>
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); onPay(order); }}
            className="flex-1 bg-white hover:bg-gray-50 text-text-primary border border-border rounded-xl py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <CreditCard size={16} /> {t('driver.ready_delivery.card.payment')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(order); }}
            className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-text-muted hover:bg-red-50 hover:text-red-500 transition-all border border-border/60 active:scale-95 shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReadyForDelivery() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const ordersRaw = useSelector(selectReadyForDelivery);
  const paymentTypes = useSelector(selectPaymentTypes);
  const loading = useSelector(selectLoading);

  // Local state for GPS fixes
  const [localGpsFixes, setLocalGpsFixes] = useState(() => {
    const saved = localStorage.getItem('livreur_gps_fixes');
    return saved ? JSON.parse(saved) : {};
  });

  // Apply local GPS fixes to orders
  const orders = useMemo(() => {
    return ordersRaw.map(order => {
      const fix = localGpsFixes[order.id];
      if (fix && order.client?.addresses?.[0]) {
        return {
          ...order,
          client: {
            ...order.client,
            addresses: [
              { ...order.client.addresses[0], latitude: fix.lat, longitude: fix.lng }
            ]
          }
        };
      }
      return order;
    });
  }, [ordersRaw, localGpsFixes]);

  const [paymentModal, setPaymentModal] = useState({ isOpen: false, order: null, success: false, selectedMethodId: null });

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Optimization State
  const [optimizedOrders, setOptimizedOrders] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [optimized, setOptimized] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [mapReady, setMapReady] = useState(false);

  // Cancellation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [travelMode, setTravelMode] = useState('driving');
  const [livreurPosition, setLivreurPosition] = useState(null);
  const watchIdRef = React.useRef(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setLivreurPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    dispatch(fetchReadyForDelivery());
    dispatch(fetchPaymentTypes());
    setMapReady(true);
  }, [dispatch]);

  // Route Optimization Logic (OSRM)
  const optimizeRoute = async (mode = travelMode) => {
    const livreurIncluded = !!livreurPosition;

    const ordersWithGPS = orders.filter(order =>
      order.client?.addresses?.[0]?.latitude && order.client?.addresses?.[0]?.longitude
    );

    if (ordersWithGPS.length < 2) {
      setOptimizationError(t('driver.ready_delivery.status.min_gps'));
      return;
    }

    setIsOptimizing(true);
    setOptimizationError(null);

    try {
      if (livreurIncluded) {
        const allCoords = [
          `${livreurPosition.lng},${livreurPosition.lat}`,
          ...ordersWithGPS.map(o => `${o.client.addresses[0].longitude},${o.client.addresses[0].latitude}`)
        ].join(';');

        const tableUrl = `https://router.project-osrm.org/table/v1/${mode}/${allCoords}?sources=0&annotations=distance`;
        const tableRes = await fetch(tableUrl);
        if (!tableRes.ok) throw new Error('OSRM Table API unavailable');
        const tableData = await tableRes.json();
        if (tableData.code !== 'Ok') throw new Error('Table distance calculation failed');

        const distancesFromLivreur = tableData.distances[0].slice(1);

        const ordersWithDistance = ordersWithGPS.map((order, idx) => ({
          ...order,
          _distanceFromLivreur: distancesFromLivreur[idx]
        }));

        const sortedOrders = [...ordersWithDistance].sort(
          (a, b) => a._distanceFromLivreur - b._distanceFromLivreur
        );

        const routeCoordsData = [
          `${livreurPosition.lng},${livreurPosition.lat}`,
          ...sortedOrders.map(o => `${o.client.addresses[0].longitude},${o.client.addresses[0].latitude}`)
        ].join(';');

        const routeUrl = `https://router.project-osrm.org/route/v1/${mode}/${routeCoordsData}?overview=full&geometries=geojson&steps=false`;
        const routeRes = await fetch(routeUrl);
        if (!routeRes.ok) throw new Error('OSRM Route API unavailable');
        const routeData = await routeRes.json();
        if (routeData.code !== 'Ok') throw new Error('Route calculation failed');

        const route = routeData.routes[0];
        const legs = route.legs;

        const reorderedWithInfo = sortedOrders.map((order, idx) => ({
          ...order,
          _legDistance: legs[idx] ? (legs[idx].distance / 1000).toFixed(1) : null,
          _legDuration: legs[idx] ? Math.round(legs[idx].duration / 60) : null,
          _stopNumber: idx + 1,
          _isFirstStop: idx === 0 
        }));

        const ordersWithoutGPS = orders.filter(order =>
          !order.client?.addresses?.[0]?.latitude || !order.client?.addresses?.[0]?.longitude
        );

        setOptimizedOrders([...reorderedWithInfo, ...ordersWithoutGPS]);
        setRouteCoords(route.geometry.coordinates.map(coord => [coord[1], coord[0]]));
        setTotalDistance((route.distance / 1000).toFixed(1));
        setTotalDuration(Math.round(route.duration / 60));
        setOptimized(true);
        
      } else {
        const coords = ordersWithGPS.map(o => `${o.client.addresses[0].longitude},${o.client.addresses[0].latitude}`).join(';');
        const response = await fetch(
          `https://router.project-osrm.org/trip/v1/${mode}/${coords}?roundtrip=false&source=first&destination=last&overview=full&geometries=geojson&annotations=true`
        );
  
        if (!response.ok) throw new Error('OSRM unavailable');
        const data = await response.json();
  
        if (data.code !== 'Ok') throw new Error('Optimization failed');
  
        const trip = data.trips[0];
        
        const clientWaypoints = data.waypoints.sort((a, b) => a.trips_index - b.trips_index);
        const reorderedOrders = clientWaypoints.map(wp => ordersWithGPS[wp.waypoint_index]).filter(Boolean);
  
        const legs = trip.legs;
        const reorderedWithInfo = reorderedOrders.map((order, idx) => ({
          ...order,
          _legDistance: legs[idx] ? (legs[idx].distance / 1000).toFixed(1) : null,
          _legDuration: legs[idx] ? Math.round(legs[idx].duration / 60) : null,
          _stopNumber: idx + 1,
          _isFirstStop: false
        }));
  
        const ordersWithoutGPS = orders.filter(order =>
          !order.client?.addresses?.[0]?.latitude || !order.client?.addresses?.[0]?.longitude
        );
  
        setOptimizedOrders([...reorderedWithInfo, ...ordersWithoutGPS]);
        setRouteCoords(trip.geometry.coordinates.map(coord => [coord[1], coord[0]]));
        setTotalDistance((trip.distance / 1000).toFixed(1));
        setTotalDuration(Math.round(trip.duration / 60));
        setOptimized(true);
      }

    } catch (error) {
      console.error('Optimization error:', error);
      setOptimizationError(t('driver.ready_delivery.status.error'));
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    const hasGPS = orders.some(o => o.client?.addresses?.[0]?.latitude && o.client?.addresses?.[0]?.longitude);
    if (orders.length >= 2 && hasGPS && !optimized) {
      optimizeRoute();
    }
  }, [orders.length]);

  const displayOrders = optimized ? optimizedOrders : orders;

  const mapMarkers = useMemo(() => {
    const source = optimized ? optimizedOrders : orders;
    return source
      .filter(order => order.client?.addresses?.[0]?.latitude && order.client?.addresses?.[0]?.longitude)
      .map((order, idx) => ({
        lat: parseFloat(order.client.addresses[0].latitude),
        lng: parseFloat(order.client.addresses[0].longitude),
        clientName: order.client?.nom || order.client?.name || order.client?.fullName || 'Client',
        phone: order.client?.phones?.[0]?.phoneNumber || 'N/A',
        orderId: order.numeroCommande || order.id,
        amount: order.montantTotal || 0,
        address: order.client?.addresses?.[0]?.address || '',
        stopNumber: optimized ? order._stopNumber : null
      }));
  }, [displayOrders, optimized]);

  const defaultCenter = [33.5731, -7.5898];
  const mapCenter = mapMarkers.length > 0 ? [mapMarkers[0].lat, mapMarkers[0].lng] : defaultCenter;

  const handleOpenPayment = (order) => {
    setPaymentModal({ isOpen: true, order });
  };

  const handleConfirmPayment = async (methodId) => {
    if (!paymentModal.order) return;
    try {
      await dispatch(confirmPayment({
        orderId: paymentModal.order.id,
        data: { modePaiement: methodId }
      })).unwrap();
      
      const paidOrder = paymentModal.order;
      const paidId = paidOrder.id;

      const ptLabel = paymentTypes.find(t => t.id === methodId)?.label || 'Paiement';
      printReceipt(paidOrder, ptLabel);

      dispatch(removeOrderFromReady(paidId));
      setOptimizedOrders(prev => prev.filter(o => o.id !== paidId));

      toast.success(t('driver.ready_delivery.toasts.payment_success'));
      setPaymentModal({ isOpen: false, order: null, success: false, selectedMethodId: null });
      dispatch(fetchReadyForDelivery());
    } catch (err) {
      toast.error(err || t('driver.delivery_details.toasts.error'));
    }
  };

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!orderToCancel) return;
    setCancelLoading(true);
    try {
      const orderId = orderToCancel.id;
      await dispatch(cancelDelivery(orderId)).unwrap();
      setOptimizedOrders(prev => prev.filter(o => o.id !== orderId));
      setCancelModalOpen(false);
      setOrderToCancel(null);
      dispatch(fetchReadyForDelivery());
      setSuccessMessage(t('driver.ready_delivery.toasts.cancel_success'));
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      setErrorMessage(t('driver.ready_delivery.toasts.cancel_error'));
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleShowGallery = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleSmartRoute = () => {
    const markers = optimized ? optimizedOrders.filter(o => o.client?.addresses?.[0]?.latitude) : orders.filter(o => o.client?.addresses?.[0]?.latitude);
    if (markers.length === 0) return;
    if (markers.length === 1) {
      window.open(`https://www.google.com/maps?q=${markers[0].client.addresses[0].latitude},${markers[0].client.addresses[0].longitude}`, '_blank');
      return;
    }
    const origin = markers[0];
    const dest = markers[markers.length - 1];
    const stops = markers.slice(1, -1);
    const waypointsParam = stops.map(o => `${o.client.addresses[0].latitude},${o.client.addresses[0].longitude}`).join('|');
    const url = waypointsParam
      ? `https://www.google.com/maps/dir/${origin.client.addresses[0].latitude},${origin.client.addresses[0].longitude}/${waypointsParam}/${dest.client.addresses[0].latitude},${dest.client.addresses[0].longitude}`
      : `https://www.google.com/maps/dir/${origin.client.addresses[0].latitude},${origin.client.addresses[0].longitude}/${dest.client.addresses[0].latitude},${dest.client.addresses[0].longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-32 animate-fade-in px-4">
      <style>{leafletStyles}</style>

      {/* STATUS MESSAGES */}
      {successMessage && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 shadow-sm animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-sm font-bold text-green-800 tracking-tight">{successMessage}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 text-start mt-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t('driver.ready_delivery.title')}</h1>
          <p className="text-sm font-medium text-text-secondary mt-1">{t('driver.ready_delivery.subtitle')}</p>
        </div>

        <div className="bg-primary-50 border border-primary-100 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-sm shrink-0">
          <ShoppingBag className="text-primary-500" size={18} />
          <p className="text-sm font-bold text-primary-600 tracking-wide leading-none">
            {t('driver.ready_delivery.orders_count', { count: orders.length })}
          </p>
        </div>
      </div>

      <div className="flex bg-gray-100/80 p-1 rounded-xl w-fit border border-gray-200/50">
        <button 
          onClick={() => { setTravelMode('driving'); optimizeRoute('driving'); }}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            travelMode === 'driving' ? 'bg-white text-primary-600 shadow-sm border border-gray-200/50' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          🚗 {t('driver.ready_delivery.travel_mode.driving')}
        </button>
        <button 
          onClick={() => { setTravelMode('foot'); optimizeRoute('foot'); }}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            travelMode === 'foot' ? 'bg-white text-primary-600 shadow-sm border border-gray-200/50' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          🚶 {t('driver.ready_delivery.travel_mode.foot')}
        </button>
      </div>

      {/* OPTIMIZATION STATUS */}
      <div className="space-y-3 text-start">
        {isOptimizing && (
          <div className="flex items-center gap-3 bg-white border border-border/60 rounded-2xl px-4 py-3 shadow-sm animate-pulse">
            <Loader2 className="animate-spin text-primary-500" size={18} />
            <span className="text-sm font-semibold text-text-secondary">{t('driver.ready_delivery.status.optimizing')}</span>
          </div>
        )}

        {optimized && !isOptimizing && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap bg-white border border-border/60 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">{t('driver.ready_delivery.status.optimized')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-primary-500" /> {totalDistance} KM
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-primary-500" /> ~{totalDuration} MIN
                </div>
              </div>
              <div className="flex flex-row ms-auto items-center gap-4">
                <button
                  className="text-[11px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1"
                  onClick={() => optimizeRoute(travelMode)}
                  disabled={isOptimizing}
                >
                  {t('driver.ready_delivery.actions.recalculate')}
                </button>
                <button
                  className="text-[11px] font-bold text-text-muted hover:text-text-primary uppercase tracking-wider transition-colors"
                  onClick={() => { setOptimized(false); setOptimizedOrders([]); setRouteCoords([]); }}
                >
                  {t('driver.ready_delivery.actions.reset')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAP SECTION */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-border/60">
        <div className="h-56 sm:h-64 md:h-72 w-full relative z-0">
          {mapReady && (
            <MapContainer
              center={mapCenter}
              zoom={mapMarkers.length > 0 ? 12 : 10}
              maxZoom={22}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                url={`https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
                tileSize={512}
                zoomOffset={-1}
                maxZoom={22}
              />
              {routeCoords.length > 0 && (
                <Polyline positions={routeCoords} pathOptions={{ color: '#F97316', weight: 3, opacity: 0.8 }} />
              )}
              {livreurPosition && <Marker position={[livreurPosition.lat, livreurPosition.lng]} icon={livreurIcon} />}
              <MapController markers={mapMarkers} selectedOrderId={selectedOrderId} />
              {mapMarkers.map((marker, idx) => {
                const isSelected = selectedOrderId === marker.orderId;
                const icon = isSelected ? createSelectedIcon(marker.stopNumber) : (optimized ? createNumberedIcon(marker.stopNumber) : orangeIcon);
                return (
                  <Marker key={idx} position={[marker.lat, marker.lng]} icon={icon}>
                    <Popup>
                      <div className="min-w-[160px] p-1">
                        <p className="font-bold text-sm text-text-primary leading-tight mb-1">{marker.clientName}</p>
                        <p className="text-xs text-text-muted mb-3 font-medium">{marker.address}</p>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                          <p className="text-sm font-bold text-primary-600">{marker.amount} DH</p>
                          <p className="text-[10px] font-bold text-text-muted">#{marker.orderId}</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )})}
            </MapContainer>
          )}
        </div>
        <div className="bg-gray-900 px-5 py-3.5 flex justify-between items-center gap-4 text-start">
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-white uppercase tracking-wide leading-tight">{t('driver.ready_delivery.actions.launch')}</h4>
            <p className="text-gray-400 text-[11px] mt-0.5 font-medium truncate">
              {mapMarkers.length > 0 ? t('driver.ready_delivery.route_info', { dist: totalDistance, time: totalDuration }) : t('driver.ready_delivery.subtitle')}
            </p>
          </div>
          <button onClick={handleSmartRoute} className="bg-primary-500 hover:bg-primary-600 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors shadow-lg shadow-primary-500/10">
            Google Maps
          </button>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-4">
        {displayOrders.length > 0 ? (
          displayOrders.map(order => (
            <DeliveryCard
              key={order.id}
              order={order}
              onPay={handleOpenPayment}
              onCancel={handleCancelOrder}
              onShowGallery={handleShowGallery}
              isOptimized={optimized}
              isSelected={selectedOrderId === order.id}
              onSelect={(id) => {
                setSelectedOrderId(id === selectedOrderId ? null : id);
                if (id !== selectedOrderId) {
                    setTimeout(() => { document.querySelector('.leaflet-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
                }
              }}
            />
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-border/40">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
              <Navigation size={32} className="text-text-muted opacity-25" />
            </div>
            <h3 className="text-lg font-bold text-text-primary tracking-tight">{t('driver.ready_delivery.empty.title')}</h3>
            <p className="text-sm font-medium text-text-muted mt-2 text-center px-8">{t('driver.ready_delivery.empty.desc')}</p>
          </div>
        )}
      </div>

      {/* MODALS */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        order={paymentModal.order}
        paymentTypes={paymentTypes}
        loading={loading.payment}
        onClose={() => setPaymentModal({ isOpen: false, order: null, success: false, selectedMethodId: null })}
        onConfirm={handleConfirmPayment}
      />

      {/* CANCEL MODAL */}
      {cancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCancelModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-modal max-w-sm w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center mb-2 tracking-tight">{t('driver.ready_delivery.cancel_modal.title')}</h3>
            <p className="text-xs text-text-muted text-center mb-6 font-semibold uppercase tracking-wider">
              {t('driver.ready_delivery.payment_modal.order_prefix')} <span className="text-red-600">#{orderToCancel.numeroCommande || orderToCancel.id}</span>
            </p>
            <p className="text-sm text-text-secondary text-center mb-8 leading-relaxed">
              {t('driver.ready_delivery.cancel_modal.question')}
            </p>
            <div className="flex gap-3">
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl py-3.5 text-xs font-bold transition-all" onClick={() => setCancelModalOpen(false)}>
                {t('driver.ready_delivery.cancel_modal.keep')}
              </button>
              <button className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3.5 text-xs font-bold transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 flex items-center justify-center gap-2" onClick={handleCancelConfirm} disabled={cancelLoading}>
                {cancelLoading ? <Loader2 className="animate-spin" size={16} /> : t('driver.ready_delivery.cancel_modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="fixed inset-0 z-[130] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300" onClick={(e) => e.target === e.currentTarget && setLightboxOpen(false)}>
          <div className="absolute top-4 start-4 bg-black/50 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
          <button className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10 transition-all" onClick={() => setLightboxOpen(false)}>
            <X className="w-6 h-6 text-white" />
          </button>
          {lightboxIndex > 0 && (
            <button className="absolute start-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all" onClick={() => setLightboxIndex(i => i - 1)}>
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}
          <img src={lightboxImages[lightboxIndex]} className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-500" alt="photo zoom" />
          {lightboxIndex < lightboxImages.length - 1 && (
            <button className="absolute end-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all" onClick={() => setLightboxIndex(i => i + 1)}>
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
