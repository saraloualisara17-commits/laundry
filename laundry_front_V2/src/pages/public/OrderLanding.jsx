import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicCategories } from '../../api/publicApi';
import { uploadsImgSrc as imgSrc } from '../../lib/imageUrl';

const LANGS    = [{ code: 'fr', label: 'FR' }, { code: 'ar', label: 'AR' }];
const WHATSAPP = '+212661466652';

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconWhatsapp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22c1.25-1.25 2.5-2.5 3.5-3.5C7 17 9 17 10 16s1-2 0-3-2-1-3 0-1 3 0 4 3 1 4 0 2-3 1-4"/>
      <path d="M22 2 11 13"/>
    </svg>
  );
}
function IconBroom() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3 L3 21 L12 18 L21 21 L15 3 Z"/><line x1="12" y1="3" x2="12" y2="10"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconTruck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}
function IconPhone2() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}
function IconCart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

function CatSkeleton() {
  return <div className="flex-shrink-0 w-28 h-28 rounded-2xl bg-gray-100 animate-pulse" />;
}

export default function OrderLanding() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [categories,  setCategories]  = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadError,   setLoadError]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const loadCategories = () => {
    setLoadingCats(true);
    setLoadError(false);
    getPublicCategories()
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => { setCategories([]); setLoadError(true); })
      .finally(() => setLoadingCats(false));
  };

  useEffect(() => { loadCategories(); }, []);

  const catName = (cat) => (isArabic && cat.nomAr) ? cat.nomAr : (cat.nomFr || cat.nom || '');

  const NAV_STEPS = [
    t('public.nav_selection'),
    t('public.nav_info'),
    t('public.nav_review'),
    t('public.nav_success'),
  ];

  return (
    <div dir="ltr" className="min-h-screen bg-white">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#0D7377] flex items-center justify-center shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 9.5v10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-10"/>
                <path d="M2 9.5h20"/><path d="M9 9.5V7a3 3 0 0 1 6 0v2.5"/>
              </svg>
            </div>
            <span className="font-extrabold text-[#1a2e44] text-base tracking-tight">Astra Propre</span>
          </div>

          {/* Step nav — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_STEPS.map((s, i) => (
              <span key={i} className="text-sm text-gray-400 font-medium">{s}</span>
            ))}
          </div>

          {/* Lang switcher + mobile toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5 border border-gray-200">
              {LANGS.map(l => (
                <button key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer
                    ${i18n.language === l.code ? 'bg-white text-[#0D7377] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 cursor-pointer"
              onClick={() => setMobileMenuOpen(o => !o)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 flex flex-col gap-3">
            {NAV_STEPS.map((s, i) => (
              <span key={i} className="text-sm text-gray-600 font-medium py-1">{s}</span>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white" style={{ minHeight: '92vh' }}>

        {/* Background image — right half on desktop, full on mobile */}
        <div className="absolute inset-0 md:inset-y-0 md:left-[45%] md:right-0">
          <img
            src="/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
          {/* Desktop: left-edge fade */}
          <div className="hidden md:block absolute inset-y-0 left-0 w-40 pointer-events-none"
            style={{ background: 'linear-gradient(to right, white, transparent)' }} />
          {/* Mobile: bottom fade so text is readable */}
          <div className="md:hidden absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.92) 70%, white 100%)' }} />
        </div>

        {/* Content column — always left */}
        <div className="relative z-10 px-5 md:px-10 pt-20 pb-16
                        md:pt-0 md:min-h-[92vh] md:flex md:flex-col md:justify-center
                        md:w-[48%] md:max-w-[560px]">
          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200
                             rounded-full px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
              <span className="text-[#0D7377]"><IconShield /></span>
              {t('public.hero_badge_quality')}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200
                             rounded-full px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
              <span className="text-[#3DB23D]"><IconLeaf /></span>
              {t('public.hero_badge_eco')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a2e44] leading-[1.1] mb-4">
            {t('public.headline_1')}<br />
            <span className="text-[#0D7377]">{t('public.headline_2')}</span>
          </h1>
          <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-sm">
            {t('public.hero_subtitle')}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => navigate('/order/wizard')}
            className="flex items-center gap-2 bg-[#1a2e44] text-white
                         px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20
                         hover:bg-[#243d58] active:scale-[0.98] transition-all duration-200 cursor-pointer">
              {t('public.start_order')}
              <IconArrow />
            </button>
            <a href={`https://wa.me/${WHATSAPP.replace('+', '')}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-white border border-gray-200 text-[#1a2e44]
                         px-6 py-3.5 rounded-xl font-bold text-sm shadow-sm
                         hover:bg-gray-50 active:scale-[0.98] transition-all duration-200">
              {t('public.hero_learn_more')}
            </a>
          </div>

          {/* Rating row */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#0D7377', '#3DB23D', '#1a2e44'].map((c, i) => (
                <div key={i}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center
                             text-white text-[10px] font-extrabold"
                  style={{ backgroundColor: c }}>
                  {['A','B','C'][i]}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => <IconStar key={i} />)}
                <span className="text-sm font-extrabold text-[#1a2e44] ml-1.5">4.9/5</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{t('public.hero_rating')}</p>
            </div>
          </div>
        </div>

        {/* Floating new-order button */}
        <button
          onClick={() => navigate('/order/wizard')}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2
                     bg-[#0D7377] text-white px-4 py-3 rounded-2xl font-bold text-sm
                     shadow-xl shadow-teal-900/30 hover:bg-[#0a6366]
                     active:scale-[0.97] transition-all duration-200 cursor-pointer">
          <IconCart />
          {t('public.hero_new_order')}
        </button>
      </section>

      {/* ── WHY ASTRA PROPRE ── */}
      <section className="bg-gray-50 py-20 px-5 md:px-10">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a2e44] mb-3">
              {t('public.why_title')}
            </h2>
            <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto">
              {t('public.why_sub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Card 1 — wide */}
            <div className="md:col-span-7 bg-white rounded-3xl p-7 border border-gray-100 shadow-sm
                            min-h-[220px] overflow-hidden relative flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-[#1a2e44] mb-4">
                  <IconBroom />
                </div>
                <h3 className="text-lg font-extrabold text-[#1a2e44] mb-2">{t('public.feat1_title')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{t('public.feat1_desc')}</p>
              </div>
              <div className="absolute end-0 bottom-0 w-44 h-36 opacity-15 pointer-events-none">
                <img src="/hero-bg-mobile.jpg" alt="" className="w-full h-full object-cover rounded-ss-3xl" />
              </div>
            </div>

            {/* Card 2 — dark */}
            <div className="md:col-span-5 bg-[#1a2e44] rounded-3xl p-7 shadow-sm min-h-[220px] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#0D7377]/20 flex items-center justify-center text-[#0D7377] mb-4">
                  <IconClock />
                </div>
                <h3 className="text-lg font-extrabold text-white mb-2">{t('public.feat2_title')}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{t('public.feat2_desc')}</p>
              </div>
            </div>

            {/* Card 3 — green */}
            <div className="md:col-span-4 bg-[#e8f5e9] rounded-3xl p-7 border border-green-100 shadow-sm min-h-[200px] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#3DB23D] mb-4 shadow-sm">
                  <IconTruck />
                </div>
                <h3 className="text-lg font-extrabold text-[#1a2e44] mb-2">{t('public.feat3_title')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t('public.feat3_desc')}</p>
              </div>
            </div>

            {/* Card 4 — app */}
            <div className="md:col-span-8 bg-white rounded-3xl p-7 border border-gray-100 shadow-sm
                            min-h-[200px] relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-[#1a2e44] mb-4">
                  <IconPhone2 />
                </div>
                <h3 className="text-lg font-extrabold text-[#1a2e44] mb-2">{t('public.feat4_title')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{t('public.feat4_desc')}</p>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 bg-gray-100 text-[#1a2e44] px-3 py-2 rounded-xl text-xs font-semibold">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    {t('public.device_desktop', { defaultValue: 'Ordinateur' })}
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-100 text-[#1a2e44] px-3 py-2 rounded-xl text-xs font-semibold">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    {t('public.device_mobile', { defaultValue: 'Mobile' })}
                  </div>
                </div>
              </div>
              <div className="absolute end-0 bottom-0 w-40 h-full opacity-10 pointer-events-none hidden md:block">
                <img src="/hero-bg.jpg" alt="" className="w-full h-full object-cover" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CATALOG ── */}
      {(loadingCats || categories.length > 0) && (
        <section className="bg-white py-16 px-5 md:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a2e44] mb-2">
                {t('public.what_clean')}
              </h2>
              <p className="text-gray-400 text-sm">{t('public.cat_subtitle')}</p>
            </div>

            {loadError && !loadingCats && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3
                              flex items-center justify-between text-sm text-red-700 max-w-md mx-auto">
                <span>{t('public.catalog_load_error', { defaultValue: 'Catalogue indisponible.' })}</span>
                <button onClick={loadCategories}
                  className="text-xs font-bold hover:underline ml-3 flex-shrink-0 cursor-pointer">
                  {t('common.retry', { defaultValue: 'Réessayer' })}
                </button>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              {loadingCats
                ? Array.from({ length: 5 }).map((_, i) => <CatSkeleton key={i} />)
                : categories.map(cat => (
                    <button key={cat.id}
                      onClick={() => navigate('/order/wizard', { state: { initialCategory: cat } })}
                      className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-2xl
                                 border border-gray-100 hover:border-[#0D7377]/30 hover:bg-teal-50/50
                                 hover:-translate-y-1 transition-all duration-200 cursor-pointer
                                 w-28 shadow-sm hover:shadow-md">
                      {cat.imageUrl
                        ? <img src={imgSrc(cat.imageUrl)} alt={catName(cat)} className="w-14 h-14 object-contain" />
                        : <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-3xl shadow-sm">
                            {cat.icon || '🧺'}
                          </div>
                      }
                      <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">
                        {catName(cat)}
                      </span>
                    </button>
                  ))
              }
            </div>

            <div className="flex justify-center mt-10">
              <button
                onClick={() => navigate('/order/wizard')}
                className="flex items-center gap-2 bg-[#1a2e44] text-white
                           px-8 py-4 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20
                           hover:bg-[#243d58] active:scale-[0.98] transition-all duration-200 cursor-pointer">
                {t('public.start_order')}
                <IconArrow />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-[#1a2e44] py-8 px-5 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0D7377] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 9.5v10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-10"/>
                <path d="M2 9.5h20"/><path d="M9 9.5V7a3 3 0 0 1 6 0v2.5"/>
              </svg>
            </div>
            <span className="text-white font-bold text-sm">Astra Propre</span>
          </div>
          <p className="text-white/40 text-xs text-center">
            © {new Date().getFullYear()} Astra Propre. {t('public.rights')}
          </p>
          <a href={`https://wa.me/${WHATSAPP.replace('+', '')}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white
                       px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1eb85a] transition-colors">
            <IconWhatsapp />
            {t('public.contact_whatsapp')}
          </a>
        </div>
      </footer>

    </div>
  );
}
