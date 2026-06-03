import { useTranslation } from 'react-i18next';

const WHATSAPP = '+212661466652';

export default function StepSuccess({ orderNumber, onNewOrder }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#f5f5f7]" dir="ltr">

      {/* ── Hero section ── */}
      <div className="flex flex-col items-center pt-16 pb-12 px-6 text-center"
        style={{ background: 'radial-gradient(ellipse at 60% 0%, #d1fae5 0%, #f5f5f7 60%)' }}>

        {/* Animated check icon */}
        <div className="relative mb-8">
          {/* Floating dots */}
          <div className="absolute -top-2 -right-3 w-3 h-3 rounded-full bg-[#3DB23D]/40" />
          <div className="absolute top-1 right-6 w-2 h-2 rounded-full bg-[#3DB23D]/25" />
          {/* Main circle */}
          <div className="relative w-24 h-24 rounded-full bg-[#bbf7d0] flex items-center justify-center
                          shadow-lg shadow-green-200">
            <div className="absolute inset-0 rounded-full bg-[#3DB23D]/10 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-[#3DB23D] flex items-center justify-center shadow-md">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-[#1a2e44] mb-4">
          {t('public.success_title', { defaultValue: 'Order Confirmed' })}
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
          {t('public.success_sub', { defaultValue: "Your fresh start is on the way! Our professionals are ready to handle your garments with the utmost care. You'll receive a confirmation email shortly." })}
        </p>
      </div>

      {/* ── Order info cards ── */}
      <div className="max-w-3xl mx-auto px-5 md:px-10 -mt-4 mb-10">
        <div className="flex gap-4 items-stretch">

          {/* Left: order reference */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              {t('public.order_reference', { defaultValue: 'Order Reference' })}
            </p>
            <div className="flex items-center justify-between mb-5">
              <p className="text-2xl font-extrabold text-[#1a2e44] tabular-nums">
                #{orderNumber || 'AST-00000'}
              </p>
              <span className="bg-[#f0fdf4] text-[#16a34a] text-xs font-bold px-3 py-1.5 rounded-full border border-[#bbf7d0]">
                {t('public.status_processing', { defaultValue: 'Processing' })}
              </span>
            </div>

            {/* Pickup / Delivery row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {t('public.pickup', { defaultValue: 'Pickup' })}
                </p>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#1a2e44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span className="text-xs font-semibold text-[#1a2e44]">
                    {t('public.pickup_soon', { defaultValue: 'Bientôt confirmé' })}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {t('public.delivery', { defaultValue: 'Delivery' })}
                </p>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#1a2e44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="1"/>
                    <path d="M16 8h4l3 3v5h-7V8z"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <span className="text-xs font-semibold text-[#1a2e44]">
                    {t('public.delivery_soon', { defaultValue: 'Après traitement' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: receipt card */}
          <div className="w-52 flex-shrink-0 bg-[#1a2e44] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
            </svg>
            <p className="text-white/60 text-xs leading-snug">
              {t('public.receipt_note', { defaultValue: 'Need a copy for your records?' })}
            </p>
            <button
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white
                         text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer border border-white/10">
              {t('public.download_receipt', { defaultValue: 'Download Receipt' })}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-center gap-4 px-6 mb-16">
        <a href={`https://wa.me/${WHATSAPP.replace('+', '')}?text=${encodeURIComponent(`Bonjour, ma commande est #${orderNumber}`)}`}
          target="_blank" rel="noreferrer"
          className="flex items-center gap-2.5 bg-[#25D366] text-white
                     px-6 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-green-200
                     hover:bg-[#1eb85a] active:scale-[0.98] transition-all duration-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
          {t('public.contact_whatsapp', { defaultValue: 'Contact us on WhatsApp' })}
        </a>

        <button onClick={onNewOrder}
          className="flex items-center gap-2.5 bg-[#1a2e44] text-white
                     px-6 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-slate-900/20
                     hover:bg-[#243d58] active:scale-[0.98] transition-all duration-200 cursor-pointer">
          {t('public.return_home', { defaultValue: 'Return to Home' })}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      {/* ── Bottom banner ── */}
      <div className="max-w-3xl mx-auto px-5 md:px-10 pb-10">
        <div className="relative rounded-3xl overflow-hidden h-44"
          style={{ background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)' }}>
          {/* Decorative blurred circles */}
          <div className="absolute top-4 right-12 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-6 right-6 w-44 h-44 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <p className="text-lg font-extrabold text-[#1a2e44] mb-1">
              {t('public.banner_title', { defaultValue: 'Your satisfaction is our priority.' })}
            </p>
            <p className="text-sm text-[#1a2e44]/60">
              {t('public.banner_sub', { defaultValue: 'Enjoy your day while we handle the laundry.' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
