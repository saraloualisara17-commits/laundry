import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadsImgSrc as imgSrc } from '../../lib/imageUrl';

export default function StepSelection({ categories, cart, setCart, initialCategory, onNext, onBack }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [activeCat, setActiveCat] = useState(initialCategory || categories[0] || null);

  const catName  = c => (isArabic && c.nomAr) ? c.nomAr : (c.nomFr || c.nom || '');
  const prodName = p => (isArabic && p.nomAr) ? p.nomAr : (p.nomFr || p.nom || '');

  const getQty     = id => cart.find(c => c.productId === id)?.quantite || 0;
  const getCartItem = id => cart.find(c => c.productId === id);

  const changeQty = (product, delta) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (!existing) {
        if (delta <= 0) return prev;
        return [...prev, {
          productId: product.id, productName: prodName(product),
          prixUnitaire: product.prixUnitaire, requiresDimensions: product.requiresDimensions,
          imageUrl: product.imageUrl || null,
          quantite: 1, largeur: null, longueur: null, poids: null,
        }];
      }
      const next = existing.quantite + delta;
      if (next <= 0) return prev.filter(c => c.productId !== product.id);
      return prev.map(c => c.productId === product.id ? { ...c, quantite: next } : c);
    });
  };

  const setDim = (productId, field, value) => {
    setCart(prev => prev.map(c =>
      c.productId === productId ? { ...c, [field]: value ? parseFloat(value) : null } : c
    ));
  };

  const products   = (activeCat?.products || []).filter(p => p.isActive);
  const totalItems = cart.reduce((s, c) => s + c.quantite, 0);
  const totalDh    = cart.reduce((s, c) => s + (c.prixUnitaire ? c.prixUnitaire * c.quantite : 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-10" dir="ltr">
      <div className="flex gap-8 items-start">

        {/* ── Left column: catalog ── */}
        <div className="flex-1 min-w-0">

          {/* Page title */}
          <h1 className="text-4xl font-extrabold text-[#1a2e44] mb-2">
            {t('public.step_items', { defaultValue: 'Item Catalog' })}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {t('public.cat_subtitle', { defaultValue: 'Select the items you would like to have professionally cleaned.' })}
          </p>

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {categories.map(cat => {
              const active = activeCat?.id === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCat(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer border
                    ${active
                      ? 'bg-[#1a2e44] text-white border-[#1a2e44]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {catName(cat)}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(product => {
              const qty      = getQty(product.id);
              const inCart   = qty > 0;
              const cartItem = getCartItem(product.id);

              return (
                <div key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">

                  {/* Top row: image + info */}
                  <div className="flex items-start gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {product.imageUrl
                        ? <img src={imgSrc(product.imageUrl)} alt={prodName(product)}
                            className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">🧺</div>
                      }
                    </div>

                    {/* Name + price + description */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base font-bold text-[#1a2e44]">{prodName(product)}</span>
                        {product.prixUnitaire && (
                          <span className="text-sm font-bold text-[#0D7377]">
                            {product.prixUnitaire} dh
                            {product.requiresDimensions
                              ? <span className="text-xs font-normal text-gray-400">/sqm</span>
                              : <span className="text-xs font-normal text-gray-400">/{t('public.unit', { defaultValue: 'u' })}</span>
                            }
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dimension inputs (if needed and in cart) */}
                  {product.requiresDimensions && inCart && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { f: 'largeur',  label: t('public.dim_largeur',  { defaultValue: 'Width (m)' })  },
                        { f: 'longueur', label: t('public.dim_longueur', { defaultValue: 'Length (m)' }) },
                      ].map(({ f, label }) => (
                        <div key={f}>
                          <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                          <input type="number" min="0" step="0.1"
                            value={cartItem?.[f] || ''}
                            onChange={e => setDim(product.id, f, e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                       focus:outline-none focus:border-[#0D7377] tabular-nums"
                            placeholder="0.0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Qty controls or Add button */}
                  <div className="flex items-center justify-between mt-auto">
                    {product.requiresDimensions && !inCart ? (
                      /* "Add to Order" button for dimension products */
                      <button onClick={() => changeQty(product, 1)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold
                                   text-[#1a2e44] hover:bg-gray-50 transition-colors cursor-pointer">
                        {t('public.add_to_order', { defaultValue: 'Add to Order' })}
                      </button>
                    ) : inCart ? (
                      /* Qty − n + */
                      <div className="flex items-center gap-3">
                        <button onClick={() => changeQty(product, -1)}
                          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center
                                     text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors text-lg font-light">
                          −
                        </button>
                        <span className="text-base font-semibold text-[#1a2e44] tabular-nums w-4 text-center">{qty}</span>
                        <button onClick={() => changeQty(product, 1)}
                          className="w-9 h-9 rounded-full bg-[#1a2e44] text-white flex items-center justify-center
                                     hover:bg-[#243d58] cursor-pointer transition-colors text-lg font-light shadow-sm">
                          +
                        </button>
                      </div>
                    ) : (
                      /* Just + button when not in cart */
                      <button onClick={() => changeQty(product, 1)}
                        className="w-9 h-9 rounded-full bg-[#1a2e44] text-white flex items-center justify-center
                                   hover:bg-[#243d58] cursor-pointer transition-colors text-lg font-light shadow-sm ml-auto">
                        +
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {products.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-20">
                <span className="text-5xl mb-4">🧺</span>
                <p className="text-gray-400 text-sm">{t('public.no_products', { defaultValue: 'No products available' })}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: order summary ── */}
        <div className="w-72 flex-shrink-0 sticky top-24">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center gap-2.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span className="text-lg font-extrabold text-[#1a2e44]">
                {t('public.order_summary', { defaultValue: 'Order Summary' })}
              </span>
            </div>

            {/* Items selected */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">
                {t('public.items_selected', { defaultValue: 'Items Selected' })}
              </span>
              <span className="text-sm font-semibold text-[#1a2e44] tabular-nums">{totalItems}</span>
            </div>

            {/* Service fee / total */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-500">
                {t('public.service_fee', { defaultValue: 'Service Fee' })}
              </span>
              <span className="text-sm font-semibold text-[#1a2e44] tabular-nums">
                {totalDh > 0 ? `${totalDh.toFixed(0)} dh` : '0 dh'}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-base font-extrabold text-[#1a2e44]">
                {t('public.total', { defaultValue: 'Total' })}
              </span>
              <span className="text-xl font-extrabold text-[#0D7377] tabular-nums">
                {totalDh > 0 ? `${totalDh.toFixed(0)} dh` : '0.00 dh'}
              </span>
            </div>

            {/* CTA */}
            <button onClick={onNext} disabled={totalItems === 0}
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm
                          transition-all duration-200
                          ${totalItems > 0
                            ? 'bg-[#1a2e44] text-white hover:bg-[#243d58] active:scale-[0.98] cursor-pointer shadow-lg shadow-slate-900/20'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {t('public.nav_info', { defaultValue: 'Continue to Info' })}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>

            {/* Terms note */}
            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              {t('public.terms_note', { defaultValue: 'By proceeding, you agree to our terms of service and garment care policy.' })}
            </p>

            {/* Eco badge */}
            <div className="flex items-start gap-2.5 bg-[#f0faf0] rounded-xl px-3.5 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#3DB23D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="flex-shrink-0 mt-0.5">
                <path d="M2 22c1-1 1-4 4-4h3c2 0 4-1 4-4V3s-3 0-5 2-3 4-3 7"/>
                <path d="M6 18c0-6 3-10 8-12"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-[#3DB23D]">
                  {t('public.eco_choice', { defaultValue: 'Eco-Choice' })}
                </p>
                <p className="text-[11px] text-[#3DB23D]/70">
                  {t('public.eco_desc', { defaultValue: 'Using 100% biodegradable detergents' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
