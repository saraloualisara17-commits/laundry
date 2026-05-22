import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, GripVertical, Pencil, Trash2, 
  ChevronRight, LayoutGrid, Package, Loader2, Info
} from 'lucide-react';
import { toast } from 'react-toastify';
import * as catalogApi from '../../api/catalog';
import CategoryFormModal from '../../components/catalog/CategoryFormModal';
import ProductFormModal from '../../components/catalog/ProductFormModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  // Modals state
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [productModal, setProductModal] = useState({ open: false, product: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: null, id: null, title: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory.id);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await catalogApi.getCategories();
      if (res.data.success) {
        setCategories(res.data.data);
        if (!selectedCategory && res.data.data.length > 0) {
          setSelectedCategory(res.data.data[0]);
        }
      }
    } catch (err) {
      toast.error("Erreur lors du chargement des catégories");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (categoryId) => {
    try {
      setProductsLoading(true);
      const res = await catalogApi.getProductsByCategory(categoryId);
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setProductsLoading(false);
    }
  };

  const handleToggleCategory = async (id) => {
    const originalCategories = [...categories];
    setCategories(categories.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
    
    try {
      const res = await catalogApi.toggleCategory(id);
      if (!res.data.success) throw new Error();
    } catch (err) {
      setCategories(originalCategories);
      toast.error("Erreur lors du changement de statut");
    }
  };

  const handleToggleProduct = async (id) => {
    const originalProducts = [...products];
    setProducts(products.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    
    try {
      const res = await catalogApi.toggleProduct(id);
      if (!res.data.success) throw new Error();
    } catch (err) {
      setProducts(originalProducts);
      toast.error("Erreur lors du changement de statut");
    }
  };

  const handleSaveCategory = async (data) => {
    try {
      setCategoryModal(prev => ({ ...prev, loading: true }));
      let res;
      if (categoryModal.category) {
        res = await catalogApi.updateCategory(categoryModal.category.id, data);
      } else {
        res = await catalogApi.createCategory(data);
      }
      
      if (res.data.success) {
        toast.success(res.data.message);
        fetchCategories();
        setCategoryModal({ open: false, category: null });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setCategoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveProduct = async (data) => {
    try {
      setProductModal(prev => ({ ...prev, loading: true }));
      let res;
      if (productModal.product) {
        res = await catalogApi.updateProduct(productModal.product.id, data);
      } else {
        res = await catalogApi.createProduct(selectedCategory.id, data);
      }
      
      if (res.data.success) {
        toast.success(res.data.message);
        fetchProducts(selectedCategory.id);
        setProductModal({ open: false, product: null });
        // Update product count in category list
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setProductModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = async () => {
    try {
      setConfirmDelete(prev => ({ ...prev, loading: true }));
      let res;
      if (confirmDelete.type === 'category') {
        res = await catalogApi.deleteCategory(confirmDelete.id);
      } else {
        res = await catalogApi.deleteProduct(confirmDelete.id);
      }
      
      if (res.data.success) {
        toast.success(res.data.message);
        if (confirmDelete.type === 'category') {
          fetchCategories();
          if (selectedCategory?.id === confirmDelete.id) setSelectedCategory(null);
        } else {
          fetchProducts(selectedCategory.id);
          fetchCategories();
        }
        setConfirmDelete({ open: false, type: null, id: null, title: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression");
    } finally {
      setConfirmDelete(prev => ({ ...prev, loading: false }));
    }
  };

  const getPricingBadge = (method) => {
    const config = {
      PER_M2: { label: "par m²", color: "bg-teal-50 text-teal-600 border-teal-100" },
      PER_UNIT: { label: "à l'unité", color: "bg-blue-50 text-blue-600 border-blue-100" },
      PER_KG: { label: "au kg", color: "bg-orange-50 text-orange-600 border-orange-100" },
      PER_LINEAR_M: { label: "au mètre", color: "bg-purple-50 text-purple-600 border-purple-100" },
      CUSTOM: { label: "prix libre", color: "bg-gray-100 text-gray-600 border-gray-200" }
    };
    const cfg = config[method] || config.PER_UNIT;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>{cfg.label}</span>;
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-[24px] shadow-sm border border-[rgba(0,0,0,0.04)] overflow-hidden animate-fade-in">
      
      {/* LEFT PANEL: CATEGORIES */}
      <div className="w-[340px] border-e border-[rgba(0,0,0,0.06)] flex flex-col bg-[var(--bg)]/30">
        <div className="p-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold text-[var(--text)]">Catalogue</h2>
            <p className="font-['Inter'] text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">
              {categories.length} catégories
            </p>
          </div>
          <button 
            onClick={() => setCategoryModal({ open: true, category: null })}
            className="w-10 h-10 bg-[var(--primary)] text-white rounded-[12px] flex items-center justify-center shadow-[var(--shadow-teal)] hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="px-4 pb-4 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-white/50 rounded-[16px] animate-pulse" />
            ))
          ) : (
            categories.map((cat) => (
              <div 
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`group relative flex items-center gap-3 p-4 rounded-[18px] transition-all cursor-pointer border ${
                  selectedCategory?.id === cat.id 
                  ? 'bg-white border-[rgba(13,115,119,0.15)] shadow-md translate-x-1' 
                  : 'bg-transparent border-transparent hover:bg-white/60'
                }`}
              >
                {selectedCategory?.id === cat.id && (
                  <div className="absolute left-0 top-4 bottom-4 w-1 bg-[var(--primary)] rounded-full" />
                )}
                
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] shrink-0 border transition-all ${
                  selectedCategory?.id === cat.id ? 'bg-[var(--primary-surface)] border-[var(--primary)]/20' : 'bg-white border-[rgba(0,0,0,0.05)]'
                }`}>
                  {cat.icon || '📦'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`font-['Plus_Jakarta_Sans'] text-[14px] font-bold truncate ${!cat.isActive ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'}`}>
                      {cat.nom}
                    </p>
                    <span className="font-['Inter'] text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-surface)] px-2 py-0.5 rounded-full">
                      {cat.productCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCategoryModal({ open: true, category: cat }); }}
                    className="p-1.5 hover:bg-[var(--bg)] rounded-md text-[var(--text-muted)] hover:text-[var(--primary)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (cat.productCount > 0) return;
                      setConfirmDelete({ open: true, type: 'category', id: cat.id, title: cat.nom }); 
                    }}
                    disabled={cat.productCount > 0}
                    className={`p-1.5 rounded-md ${cat.productCount > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500'}`}
                    title={cat.productCount > 0 ? "Cette catégorie contient des produits" : "Supprimer"}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: PRODUCTS */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedCategory ? (
          <>
            <div className="p-8 flex items-center justify-between border-b border-[rgba(0,0,0,0.04)] shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[20px] bg-[var(--primary-surface)] border border-[rgba(13,115,119,0.1)] flex items-center justify-center text-[28px] shadow-sm">
                  {selectedCategory.icon}
                </div>
                <div>
                  <h1 className="font-['Plus_Jakarta_Sans'] text-[24px] font-bold text-[var(--text)] tracking-tight">
                    {selectedCategory.nom}
                  </h1>
                  <p className="font-['Inter'] text-[13px] text-[var(--text-muted)] font-medium">
                    Gestion des articles et services
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setProductModal({ open: true, product: null })}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-[14px] text-[14px] font-bold uppercase tracking-wider shadow-[var(--shadow-teal)] hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} />
                Nouveau Produit
              </button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
              {productsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-32 bg-[var(--bg)] rounded-[20px] animate-pulse" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                  <Package size={64} className="mb-4 text-[var(--primary)]" />
                  <p className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold">Aucun produit</p>
                  <p className="font-['Inter'] text-[14px]">Ajoutez votre premier article dans cette catégorie</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div 
                      key={product.id}
                      className={`group bg-white rounded-[22px] border transition-all p-5 flex flex-col justify-between h-full ${
                        product.isActive 
                        ? 'border-[rgba(0,0,0,0.06)] hover:border-[var(--primary)] hover:shadow-lg' 
                        : 'border-[rgba(0,0,0,0.04)] bg-[var(--bg)]/40 grayscale-[0.5]'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-['Plus_Jakarta_Sans'] text-[16px] font-bold truncate mb-1 ${!product.isActive ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
                              {product.nom}
                            </h3>
                            {getPricingBadge(product.pricingMethod)}
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={product.isActive}
                              onChange={() => handleToggleProduct(product.id)}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                          </label>
                        </div>

                        {product.description && (
                          <p className="font-['Inter'] text-[12px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 py-3 border-y border-[rgba(0,0,0,0.04)]">
                          <div className="flex-1">
                            <p className="font-['Inter'] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Prix</p>
                            <p className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold text-[var(--text)]">
                              {product.pricingMethod === 'CUSTOM' ? '—' : (
                                <>
                                  {product.prixUnitaire}
                                  <span className="text-[11px] font-bold text-[var(--text-muted)] ml-1">
                                    DH / {product.pricingMethod === 'PER_UNIT' ? product.uniteLabel : 
                                         product.pricingMethod === 'PER_M2' ? 'm²' :
                                         product.pricingMethod === 'PER_KG' ? 'kg' : 'm'}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-['Inter'] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Délai</p>
                            <p className="font-['Inter'] text-[13px] font-bold text-[var(--text)]">~{product.processingDays} jours</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.04)] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setProductModal({ open: true, product })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg)] text-[var(--text-secondary)] rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-[var(--primary-surface)] hover:text-[var(--primary)] transition-all"
                        >
                          <Pencil size={12} /> Modifier
                        </button>
                        <button 
                          onClick={() => setConfirmDelete({ open: true, type: 'product', id: product.id, title: product.nom })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={12} /> Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-[var(--bg)]/20 p-12">
            <div className="w-24 h-24 rounded-[30px] bg-white shadow-xl flex items-center justify-center text-[var(--primary)] mb-6 animate-bounce-slow">
              <LayoutGrid size={48} />
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-[24px] font-bold text-[var(--text)] mb-2">Gestion du Catalogue</h2>
            <p className="font-['Inter'] text-[15px] text-[var(--text-muted)] text-center max-w-sm leading-relaxed">
              Sélectionnez une catégorie dans le panneau de gauche pour gérer ses produits et tarifs.
            </p>
          </div>
        )}
      </div>

      {/* MODALS */}
      <CategoryFormModal 
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSave={handleSaveCategory}
        category={categoryModal.category}
        loading={categoryModal.loading}
      />

      <ProductFormModal 
        isOpen={productModal.open}
        onClose={() => setProductModal({ open: false, product: null })}
        onSave={handleSaveProduct}
        product={productModal.product}
        loading={productModal.loading}
      />

      <ConfirmModal 
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, type: null, id: null, title: '' })}
        onConfirm={handleDelete}
        title={`Supprimer ${confirmDelete.type === 'category' ? 'la catégorie' : 'le produit'}`}
        message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete.title}" ? Cette action est irréversible.`}
        type="danger"
        loading={confirmDelete.loading}
      />
    </div>
  );
}
