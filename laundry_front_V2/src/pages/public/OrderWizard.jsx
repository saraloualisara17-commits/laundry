import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitPublicOrder } from '../../api/publicApi';
import LocationPickerModal from './LocationPickerModal';

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const clean = url.replace(/^\/+/, '').replace(/^uploads\//, '');
  return `/uploads/${clean}`;
};

// ── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
            ${i < step ? 'bg-[#3DB23D] text-white' : i === step ? 'bg-[#0D7377] text-white' : 'bg-gray-200 text-gray-400'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-1 w-8 rounded-full transition-all ${i < step ? 'bg-[#3DB23D]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Item selection ───────────────────────────────────────────────────
function StepItems({ categories, cart, setCart, initialCategory }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [activeCategory, setActiveCategory] = useState(initialCategory || categories[0] || null);

  const categoryName = (cat) => {
    if (isArabic && cat.nomAr) return cat.nomAr;
    return cat.nomFr || cat.nom || '';
  };

  const productName = (p) => {
    if (isArabic && p.nomAr) return p.nomAr;
    return p.nomFr || p.nom || '';
  };

  const getQty = (productId) => cart.find(c => c.productId === productId)?.quantite || 0;

  const updateQty = (product, delta) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (!existing) {
        if (delta <= 0) return prev;
        return [...prev, {
          productId: product.id,
          productName: productName(product),
          prixUnitaire: product.prixUnitaire,
          pricingMethod: product.pricingMethod,
          requiresDimensions: product.requiresDimensions,
          quantite: 1,
          largeur: null,
          longueur: null,
          poids: null,
        }];
      }
      const newQty = existing.quantite + delta;
      if (newQty <= 0) return prev.filter(c => c.productId !== product.id);
      return prev.map(c => c.productId === product.id ? { ...c, quantite: newQty } : c);
    });
  };

  const updateDimension = (productId, field, value) => {
    setCart(prev => prev.map(c =>
      c.productId === productId ? { ...c, [field]: value ? parseFloat(value) : null } : c
    ));
  };

  const products = activeCategory?.products || [];

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-5">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeCategory?.id === cat.id
                ? 'bg-[#0D7377] text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#0D7377]'
            }`}
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {categoryName(cat)}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="space-y-3">
        {products.filter(p => p.isActive).map(product => {
          const qty = getQty(product.id);
          const cartItem = cart.find(c => c.productId === product.id);
          return (
            <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                {product.imageUrl ? (
                  <img
                    src={imgSrc(product.imageUrl)}
                    alt={productName(product)}
                    className="w-14 h-14 object-contain rounded-xl bg-gray-50"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-2xl">
                    🧺
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{productName(product)}</p>
                  {product.prixUnitaire && (
                    <p className="text-xs text-[#0D7377] font-bold mt-0.5">
                      {product.prixUnitaire} {t('common.dh')} / {product.uniteLabel || t('public.unit')}
                    </p>
                  )}
                </div>
                {/* Qty control */}
                <div className="flex items-center gap-2">
                  {qty > 0 && (
                    <button
                      onClick={() => updateQty(product, -1)}
                      className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                    >
                      −
                    </button>
                  )}
                  {qty > 0 && (
                    <span className="w-6 text-center font-bold text-[#0D7377]">{qty}</span>
                  )}
                  <button
                    onClick={() => updateQty(product, 1)}
                    className="w-8 h-8 rounded-full bg-[#3DB23D] text-white font-bold hover:bg-[#2d9e2d] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dimension inputs if required and qty > 0 */}
              {product.requiresDimensions && qty > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
                  {['largeur', 'longueur', 'poids'].map(field => (
                    <div key={field}>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                        {t(`public.dim_${field}`)}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={cartItem?.[field] || ''}
                        onChange={e => updateDimension(product.id, field, e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-[#0D7377]"
                        placeholder="m"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {products.filter(p => p.isActive).length === 0 && (
          <p className="text-gray-400 text-center py-10">{t('public.no_products')}</p>
        )}
      </div>

      {/* Cart summary bar */}
      {cart.length > 0 && (
        <div className="mt-4 bg-[#0D7377] text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="font-semibold text-sm">
            {cart.reduce((s, c) => s + c.quantite, 0)} {t('public.items_selected')}
          </span>
          <div className="flex gap-1.5">
            {cart.map(c => (
              <span key={c.productId} className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                {c.productName} ×{c.quantite}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Client info ──────────────────────────────────────────────────────
function StepClientInfo({ info, setInfo }) {
  const { t } = useTranslation();
  const set = (field, value) => setInfo(prev => ({ ...prev, [field]: value }));
  const [showMap, setShowMap] = useState(false);

  const handleLocationConfirm = ({ address, lat, lng }) => {
    setInfo(prev => ({
      ...prev,
      clientAddress:    address,
      deliveryLatitude:  lat,
      deliveryLongitude: lng,
    }));
    setShowMap(false);
  };

  return (
    <div className="space-y-4">
      {/* Full-screen map modal */}
      {showMap && (
        <LocationPickerModal
          onConfirm={handleLocationConfirm}
          onClose={() => setShowMap(false)}
          initialLocation={
            info.deliveryLatitude
              ? { lat: info.deliveryLatitude, lng: info.deliveryLongitude, address: info.clientAddress }
              : null
          }
        />
      )}

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
          {t('public.client_name')} *
        </label>
        <input
          type="text"
          value={info.clientName}
          onChange={e => set('clientName', e.target.value)}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377]"
          placeholder={t('public.name_placeholder')}
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
          {t('public.client_phone')} *
        </label>
        <input
          type="tel"
          value={info.clientPhone}
          onChange={e => set('clientPhone', e.target.value)}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377]"
          placeholder="06XXXXXXXX"
          dir="ltr"
        />
      </div>

      {/* Location picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
          {t('public.client_address')}
        </label>

        {info.deliveryLatitude ? (
          // Location confirmed — show preview card
          <div className="bg-[#f0fdf4] border border-[#3DB23D] rounded-2xl px-4 py-3 flex items-start gap-3">
            <span className="text-[#3DB23D] text-xl flex-shrink-0 mt-0.5">📍</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 line-clamp-2">{info.clientAddress}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {info.deliveryLatitude.toFixed(5)}, {info.deliveryLongitude.toFixed(5)}
              </p>
            </div>
            <button
              onClick={() => setShowMap(true)}
              className="text-xs text-[#0D7377] font-bold flex-shrink-0 hover:underline mt-0.5"
            >
              Modifier
            </button>
          </div>
        ) : (
          // No location yet — dashed prompt button
          <button
            onClick={() => setShowMap(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-5
                       flex flex-col items-center gap-2
                       hover:border-[#0D7377] hover:bg-[#f0fdf4] transition-all group"
          >
            <span className="text-3xl">🗺️</span>
            <span className="text-sm font-semibold text-gray-500 group-hover:text-[#0D7377]">
              Choisir sur la carte
            </span>
            <span className="text-xs text-gray-400">Recherchez, épinglez ou utilisez votre GPS</span>
          </button>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
          {t('public.notes')}
        </label>
        <textarea
          value={info.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377] resize-none"
          placeholder={t('public.notes_placeholder')}
        />
      </div>
    </div>
  );
}

// ── Step 3: Confirm ──────────────────────────────────────────────────────────
function StepConfirm({ cart, info }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Client info recap */}
      <div className="bg-[#f0fdf4] rounded-2xl p-4">
        <p className="text-xs font-bold text-gray-500 uppercase mb-3">{t('public.your_info')}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('public.client_name')}</span>
            <span className="font-semibold">{info.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('public.client_phone')}</span>
            <span className="font-semibold" dir="ltr">{info.clientPhone}</span>
          </div>
          {info.clientAddress && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t('public.client_address')}</span>
              <span className="font-semibold text-right max-w-[60%]">{info.clientAddress}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items recap */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 uppercase mb-3">{t('public.your_items')}</p>
        <div className="space-y-2">
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold">{item.productName}</span>
                {item.requiresDimensions && item.largeur && (
                  <span className="text-xs text-gray-400 ml-2">
                    {item.largeur}×{item.longueur} m
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-xs">×{item.quantite}</span>
                {item.prixUnitaire && (
                  <span className="text-[#0D7377] font-bold ml-2">
                    {(item.prixUnitaire * item.quantite).toFixed(0)} dh
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-700">
        ℹ️ {t('public.confirm_note')}
      </div>
    </div>
  );
}

// ── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ orderNumber, onNewOrder }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-24 h-24 bg-[#e8f5e9] rounded-full flex items-center justify-center mb-6">
        <span className="text-5xl">✅</span>
      </div>
      <h2 className="text-2xl font-extrabold text-[#1a2e44] mb-2">
        {t('public.success_title')}
      </h2>
      <p className="text-gray-500 mb-4">{t('public.success_sub')}</p>
      <div className="bg-[#f0fdf4] border border-[#3DB23D] rounded-2xl px-6 py-4 mb-6">
        <p className="text-xs text-gray-500 mb-1">{t('public.order_number')}</p>
        <p className="text-2xl font-extrabold text-[#0D7377]" dir="ltr">{orderNumber}</p>
      </div>
      <p className="text-sm text-gray-400 mb-8 max-w-xs">{t('public.success_contact')}</p>
      <button
        onClick={onNewOrder}
        className="bg-[#0D7377] text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow hover:bg-[#0a6366] transition-all"
      >
        {t('public.new_order')}
      </button>
    </div>
  );
}

// ── Main wizard ──────────────────────────────────────────────────────────────
export default function OrderWizard({ initialCategory, categories, onBack }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [info, setInfo] = useState({
    clientName: '', clientPhone: '', clientAddress: '', notes: '',
    deliveryLatitude: null, deliveryLongitude: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const STEPS = [t('public.step_items'), t('public.step_info'), t('public.step_confirm')];

  const canProceed = () => {
    if (step === 0) return cart.length > 0;
    if (step === 1) return info.clientName.trim() && info.clientPhone.trim();
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        clientName:        info.clientName.trim(),
        clientPhone:       info.clientPhone.trim(),
        clientAddress:     info.clientAddress.trim() || undefined,
        deliveryLatitude:  info.deliveryLatitude  || undefined,
        deliveryLongitude: info.deliveryLongitude || undefined,
        notes:             info.notes.trim() || undefined,
        items: cart.map(c => ({
          productId: c.productId,
          quantite:  c.quantite,
          largeur:   c.largeur  || undefined,
          longueur:  c.longueur || undefined,
          poids:     c.poids    || undefined,
        })),
      };
      const res = await submitPublicOrder(payload);
      setOrderNumber(res.data.orderNumber);
      setStep(3);
    } catch (e) {
      setError(t('public.submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setCart([]);
    setInfo({ clientName: '', clientPhone: '', clientAddress: '', notes: '', deliveryLatitude: null, deliveryLongitude: null });
    setStep(0);
    setOrderNumber('');
    onBack();
  };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-[#0D7377] px-6 pt-10 pb-6">
        <div className="flex items-center gap-4 mb-4">
          {step < 3 && (
            <button
              onClick={step === 0 ? onBack : () => setStep(s => s - 1)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              {isArabic ? '→' : '←'}
            </button>
          )}
          <span className="text-white font-extrabold text-lg tracking-wide">Astra Propre</span>
        </div>
        {step < 3 && (
          <>
            <h1 className="text-white font-extrabold text-xl mb-1">{STEPS[step]}</h1>
            <StepBar step={step} total={3} />
          </>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-6 max-w-lg mx-auto">
        {step === 0 && (
          <StepItems
            categories={categories}
            cart={cart}
            setCart={setCart}
            initialCategory={initialCategory}
          />
        )}
        {step === 1 && <StepClientInfo info={info} setInfo={setInfo} />}
        {step === 2 && <StepConfirm cart={cart} info={info} />}
        {step === 3 && <SuccessScreen orderNumber={orderNumber} onNewOrder={handleNewOrder} />}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        {step < 3 && (
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              onClick={step === 2 ? handleSubmit : () => setStep(s => s + 1)}
              disabled={!canProceed() || submitting}
              className={`flex-1 px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow transition-all
                ${canProceed() && !submitting
                  ? 'bg-[#0D7377] hover:bg-[#0a6366]'
                  : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {submitting
                ? t('common.loading')
                : step === 2
                  ? t('public.confirm_order')
                  : t('public.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
