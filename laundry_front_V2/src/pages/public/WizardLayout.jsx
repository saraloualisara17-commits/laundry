import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const LANGS = [{ code: 'fr', label: 'FR' }, { code: 'ar', label: 'AR' }];

// step: 0=Selection, 1=Info, 2=Review, 3=Success
export default function WizardLayout({ step, children }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const STEPS = [
    t('public.nav_selection'),
    t('public.nav_info'),
    t('public.nav_review'),
    t('public.nav_success'),
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between gap-6">

          {/* Brand */}
          <button onClick={() => navigate('/order')}
            className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-[#0D7377] flex items-center justify-center shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 9.5v10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-10"/>
                <path d="M2 9.5h20"/><path d="M9 9.5V7a3 3 0 0 1 6 0v2.5"/>
              </svg>
            </div>
            <span className="font-extrabold text-[#1a2e44] text-base tracking-tight">Astra Propre</span>
          </button>

          {/* Step labels */}
          <div className="hidden md:flex items-center gap-8">
            {STEPS.map((s, i) => (
              <span key={i}
                className={`text-sm font-semibold transition-colors
                  ${i === step ? 'text-[#0D7377] font-bold' : 'text-gray-400'}`}>
                {s}
              </span>
            ))}
          </div>

          {/* Lang switcher */}
          <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5 border border-gray-200 flex-shrink-0">
            {LANGS.map(l => (
              <button key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer
                  ${i18n.language === l.code ? 'bg-white text-[#0D7377] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Step indicator ── */}
      {step < 3 && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 flex flex-col items-center gap-6">
            {/* Dots + lines */}
            <div className="flex items-center w-full max-w-md">
              {STEPS.map((label, i) => {
                const done    = i < step;
                const current = i === step;
                return (
                  <div key={i} className="flex items-center flex-1 last:flex-none">
                    {/* Connector line */}
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 transition-all duration-500
                        ${done ? 'bg-[#0D7377]' : 'bg-gray-200'}`} />
                    )}
                    {/* Dot */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                      flex-shrink-0 transition-all duration-300 border-2
                      ${done
                        ? 'bg-[#0D7377] border-[#0D7377] text-white'
                        : current
                          ? 'bg-[#1a2e44] border-[#1a2e44] text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}>
                      {done
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : i + 1}
                    </div>
                    {/* Connector line after (for non-last) */}
                    {i < STEPS.length - 1 && i === 0 && (
                      <div className={`flex-1 h-0.5 transition-all duration-500
                        ${step > 0 ? 'bg-[#0D7377]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Labels row */}
            <div className="flex w-full max-w-md justify-between">
              {STEPS.map((label, i) => (
                <span key={i}
                  className={`text-xs font-semibold text-center w-9
                    ${i === step ? 'text-[#0D7377]' : i < step ? 'text-[#0D7377]/60' : 'text-gray-400'}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <div className="flex-1">
        {children}
      </div>

    </div>
  );
}
