import { useTranslation } from 'react-i18next';
import { uploadsImgSrc as imgSrc } from '../../lib/imageUrl';

export default function StepReview({ cart, info, submitting, error, onSubmit, onBack }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const prodName = p => (isArabic && p.productNameAr) ? p.productNameAr : (p.productName || '');
  const totalDh  = cart.reduce((s, c) => s + (c.prixUnitaire ? c.prixUnitaire * c.quantite : 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10" dir="ltr">

      <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a2e44] mb-1">
        {t('public.review_title', { defaultValue: 'Final Review' })}
      </h1>
      <p className="text-gray-500 text-sm mb-6 md:mb-8">
        {t('public.review_subtitle', { defaultValue: 'Please confirm your order details and delivery information before proceeding.' })}
      </p>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left: items + notes ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Order summary header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
              </svg>
              <span className="text-base font-extrabold text-[#1a2e44]">
                {t('public.order_summary', { defaultValue: 'Order Summary' })}
              </span>
            </div>
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#0D7377]
                         hover:text-[#0a6366] transition-colors cursor-pointer">
              {t('public.edit_items', { defaultValue: 'Edit items' })}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>

          {/* Cart items */}
          <div className="flex flex-col gap-3">
            {cart.map(item => (
              <div key={item.productId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 md:gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.imageUrl
                    ? <img src={imgSrc(item.imageUrl)} alt={prodName(item)} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🧺</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#1a2e44] leading-snug">{prodName(item)}</p>
                    {item.prixUnitaire && (
                      <span className="text-sm font-bold text-[#1a2e44] tabular-nums flex-shrink-0">
                        {(item.prixUnitaire * item.quantite).toFixed(0)} dh
                      </span>
                    )}
                  </div>
                  {item.requiresDimensions && item.largeur && (
                    <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                      {item.largeur} × {item.longueur} m
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {t('public.qty', { defaultValue: 'Qty' })}: {item.quantite}
                    {item.prixUnitaire && item.quantite > 1 && (
                      <span className="ml-2">· {item.prixUnitaire} dh/u</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {info.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="#1a2e44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="15" y2="18"/>
                </svg>
                <span className="text-sm font-bold text-[#1a2e44]">
                  {t('public.special_instructions', { defaultValue: 'Special Instructions' })}
                </span>
              </div>
              <p className="text-sm text-gray-500 italic leading-relaxed">"{info.notes}"</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3
                            text-sm flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* ── Right: delivery + payment ── */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 lg:sticky lg:top-24">

          {/* Delivery Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="1"/>
                  <path d="M16 8h4l3 3v5h-7V8z"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <span className="text-sm font-extrabold text-[#1a2e44]">
                  {t('public.delivery_details', { defaultValue: 'Delivery Details' })}
                </span>
              </div>
              <button onClick={onBack}
                className="text-xs font-semibold text-[#0D7377] hover:text-[#0a6366] transition-colors cursor-pointer">
                {t('public.change', { defaultValue: 'Change' })}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[#1a2e44]">{info.clientName}</p>
                  <p className="text-xs text-gray-400 tabular-nums mt-0.5" dir="ltr">{info.clientPhone}</p>
                </div>
              </div>
              {info.clientAddress && (
                <div className="flex items-start gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="flex-shrink-0 mt-0.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <p className="text-sm text-gray-600 leading-snug">{info.clientAddress}</p>
                </div>
              )}
              {info.deliveryLatitude && (
                <div className="flex items-start gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  </svg>
                  <p className="text-xs text-gray-400 tabular-nums" dir="ltr">
                    {info.deliveryLatitude.toFixed(5)}, {info.deliveryLongitude.toFixed(5)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-[#1a2e44] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
            <h3 className="text-base font-extrabold text-white">
              {t('public.payment_summary', { defaultValue: 'Payment Summary' })}
            </h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">{t('public.subtotal', { defaultValue: 'Subtotal' })}</span>
                <span className="text-sm font-semibold text-white tabular-nums">{totalDh.toFixed(0)} dh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">{t('public.service_fee', { defaultValue: 'Service Fee' })}</span>
                <span className="text-sm font-semibold text-white tabular-nums">0 dh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">{t('public.delivery_fee', { defaultValue: 'Delivery' })}</span>
                <span className="text-sm font-bold text-[#3DB23D]">{t('public.free', { defaultValue: 'FREE' })}</span>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                {t('public.total_amount', { defaultValue: 'Total Amount' })}
              </p>
              <p className="text-3xl font-extrabold text-white tabular-nums">
                {totalDh > 0 ? `${totalDh.toFixed(0)} dh` : '—'}
              </p>
              <p className="text-xs text-white/40 mt-1">
                {t('public.price_estimate_note', { defaultValue: 'Estimated — final price confirmed after inspection' })}
              </p>
            </div>
            <button onClick={onSubmit} disabled={submitting}
              className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-sm
                          transition-all duration-200
                          ${!submitting
                            ? 'bg-[#3DB23D] text-white hover:bg-[#33a033] active:scale-[0.98] cursor-pointer shadow-lg shadow-green-900/30'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'}`}>
              {submitting ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  {t('common.loading', { defaultValue: 'Chargement...' })}
                </>
              ) : (
                <>
                  {t('public.confirm_place_order', { defaultValue: 'Confirm & Place Order' })}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
            <p className="text-[11px] text-white/30 text-center leading-relaxed">
              {t('public.order_terms', { defaultValue: 'By placing your order, you agree to our Terms of Service.' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
