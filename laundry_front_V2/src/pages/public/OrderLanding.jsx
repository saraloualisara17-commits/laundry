import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPublicCategories } from '../../api/publicApi';
import OrderWizard from './OrderWizard';

const LANGS = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
];

const WHATSAPP = '+212661466652';

const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const clean = url.replace(/^\/+/, '').replace(/^uploads\//, '');
  return `/uploads/${clean}`;
};

export default function OrderLanding() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    getPublicCategories()
      .then(res => setCategories(res.data))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, []);

  const categoryName = (cat) => {
    if (isArabic && cat.nomAr) return cat.nomAr;
    if (cat.nomFr) return cat.nomFr;
    return cat.nom || cat.nomFr || cat.nomAr || '';
  };

  const handleStart = (cat = null) => {
    setSelectedCategory(cat);
    setShowWizard(true);
  };

  if (showWizard) {
    return (
      <OrderWizard
        initialCategory={selectedCategory}
        categories={categories}
        onBack={() => setShowWizard(false)}
      />
    );
  }

  const ar = isArabic ? 'text-right' : '';

  return (
    <div dir="ltr" className="relative min-h-screen bg-[#e8f0fe] overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════
          HERO IMAGE
          Mobile  : fills the entire screen height (h-screen),
                    pinned to top — visible behind all content
          Desktop : absolute right half (60% wide)
         ══════════════════════════════════════════════════════ */}
      <div className="pointer-events-none select-none
                      absolute top-0 left-0 w-full h-screen
                      md:inset-0 md:h-full">
        <picture>
          {/* Drop hero-bg-mobile.jpg in /public for a phone-optimised image */}
          <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.jpg" />
          <img
            src="/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-top
                       md:absolute md:right-0 md:top-0 md:h-full md:w-[60%]
                       md:object-contain md:object-right"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </picture>

        {/* Mobile  : fade bottom-to-top so overlaid text is readable     */}
        {/* Desktop : fade left-to-right, preserving original look         */}
        <div className="absolute inset-0
                        bg-gradient-to-t from-[#e8f0fe] from-20% via-[#e8f0fecc] via-50% to-transparent
                        md:bg-gradient-to-r md:from-[#e8f0fe] md:from-30% md:via-[#e8f0fee0] md:via-45% md:to-transparent" />
      </div>

      {/* ── Language switcher — floats above image ── */}
      <div className="relative z-10 flex items-center justify-end px-6 pt-6">
        <div className="flex gap-1 bg-white/80 backdrop-blur rounded-full px-2 py-1 shadow-sm">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => i18n.changeLanguage(l.code)}
              className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${
                i18n.language === l.code
                  ? 'bg-[#0D7377] text-white shadow'
                  : 'text-gray-500 hover:text-[#0D7377]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT
          Mobile  : pushed ~55vh down so the image shows above,
                    overlaid on top of the gradient — scrolls naturally
          Desktop : original left-column layout
         ══════════════════════════════════════════════════════ */}
      <div className="relative z-10
                      pt-[55vh] px-6 pb-10
                      md:pt-10 md:pb-10 md:ml-[5%] md:pl-6 md:pr-4
                      md:w-[42%] md:min-w-[340px]">

        {/* Headline */}
        <h1 className={`text-3xl md:text-4xl font-extrabold text-[#1a2e44] leading-tight mb-3 ${ar}`}>
          {t('public.headline_1')}<br />
          <span className="text-[#3DB23D]">{t('public.headline_2')}</span>
        </h1>
        <p className={`text-gray-500 text-sm md:text-base mb-6 ${ar}`}>
          {t('public.subtitle')}
        </p>

        {/* "What would you like to clean?" */}
        <p className={`text-[#0D7377] font-bold text-base mb-4 ${ar}`}>
          {t('public.what_clean')}
        </p>

        {/* Category cards — horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {loadingCats
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-32 h-40 bg-white/60 rounded-2xl animate-pulse" />
              ))
            : categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleStart(cat)}
                  className="flex-shrink-0 w-32 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md
                             transition-all hover:-translate-y-1 flex flex-col items-center gap-2 group"
                >
                  {cat.imageUrl ? (
                    <img
                      src={imgSrc(cat.imageUrl)}
                      alt={categoryName(cat)}
                      className="w-20 h-20 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-3xl">
                      {cat.icon || '🧺'}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                    {categoryName(cat)}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#3DB23D] flex items-center justify-center shadow
                                  group-hover:bg-[#2d9e2d] transition-colors">
                    <span className="text-white text-lg leading-none">+</span>
                  </div>
                </button>
              ))
          }
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 mt-6 md:mt-8">
          {[
            { icon: '📅', title: t('public.feature_schedule'), sub: t('public.feature_schedule_sub') },
            { icon: '🛡️', title: t('public.feature_quality'), sub: t('public.feature_quality_sub') },
            { icon: '🌿', title: t('public.feature_eco'), sub: t('public.feature_eco_sub') },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/70 backdrop-blur rounded-2xl px-4 py-3 flex-1 min-w-[140px]">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className={`text-xs font-bold text-gray-800 ${ar}`}>{f.title}</p>
                <p className={`text-[11px] text-gray-500 mt-0.5 ${ar}`}>{f.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons — stacked on mobile, side-by-side on tablets+ */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-8">
          <button
            onClick={() => handleStart()}
            className="flex justify-center items-center gap-2 bg-[#1a2e44] text-white
                       px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg
                       hover:bg-[#243d58] transition-all"
          >
            <span>📋</span>
            {t('public.start_order')}
            <span>→</span>
          </button>
          <a
            href={`https://wa.me/${WHATSAPP.replace('+', '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex justify-center items-center gap-2 bg-white text-[#1a2e44]
                       px-6 py-3.5 rounded-2xl font-bold text-sm shadow
                       border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <span>📞</span>
            {t('public.contact_us')}
          </a>
        </div>

      </div>
    </div>
  );
}
