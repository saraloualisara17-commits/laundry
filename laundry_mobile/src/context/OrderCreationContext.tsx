import React, { createContext, useContext, useState, useMemo } from 'react';

export type OrderMode = 'immediate' | 'scheduled';

export interface OrderItem {
  cartId: string; // Unique ID for items in the current order bag
  productId: number;
  nom: string;
  categoryIcon?: string;
  quantite: number;
  largeur?: number;
  hauteur?: number;
  longueur?: number;
  poids?: number;
  prixUnitaire: number;
  prixFinal: number;
  remiseMontant?: number;
  remiseRaison?: string;
  couleur?: string;
  notes?: string;
  pricingMethod: string;
  uniteLabel?: string;
  imageUrls?: string[]; // Local URIs captured during order creation
}


export interface ClientData {
  id?: number;
  name: string;
  phone: string;
  phoneSecondary?: string;
  email?: string;
  address?: string;
  quartier?: string;
  rue?: string;
  batiment?: string;
  appartement?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface PendingLocation {
  address: string;
  region: string;
  lat: number;
  lng: number;
}

interface OrderCreationContextType {
  mode: OrderMode | null;
  client: ClientData | null;
  deliveryType: string | null;
  livreurId: number | null;
  scheduledDate: string | null;
  items: OrderItem[];
  orderNotes: string;
  orderImages: string[];
  paymentMethod: string | null;
  paidAmount: number;
  pendingLocation: PendingLocation | null;
  editingOrderId: number | string | null;
  
  setMode: (mode: OrderMode | null) => void;
  setClient: (client: ClientData | null) => void;
  setDeliveryType: (type: string | null) => void;
  setLivreur: (id: number | null) => void;
  setScheduledDate: (date: string | null) => void;
  addItem: (item: OrderItem) => void;
  removeItem: (cartId: string) => void;
  updateItem: (cartId: string, item: OrderItem) => void;
  setOrderNotes: (notes: string) => void;
  setOrderImages: (images: string[]) => void;
  setPaymentMethod: (method: string | null) => void;
  setPaidAmount: (amount: number) => void;
  setPendingLocation: (loc: PendingLocation | null) => void;
  setEditingOrderId: (id: number | string | null) => void;
  loadOrderForEditing: (order: any) => void;
  clearOrder: () => void;
  
  totalAmount: number;
  itemCount: number;
  totalArea: number;
  totalCarpets: number;
  remainingAmount: number;
}

const OrderCreationContext = createContext<OrderCreationContextType | undefined>(undefined);

export const OrderCreationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<OrderMode | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [deliveryType, setDeliveryType] = useState<string | null>(null);
  const [livreurId, setLivreur] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderImages, setOrderImages] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | string | null>(null);

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.prixFinal, 0), [items]);
  const itemCount = items.length;
  
  const totalArea = useMemo(() => 
    items.reduce((sum, item) => sum + ((item.largeur || 0) * (item.hauteur || 0)), 0), 
  [items]);

  const totalCarpets = useMemo(() => 
    items.filter(i => i.pricingMethod === 'PER_M2').length,
  [items]);

  const remainingAmount = useMemo(() => Math.max(0, totalAmount - paidAmount), [totalAmount, paidAmount]);

  const addItem = (item: OrderItem) => setItems(prev => [...prev, item]);
  const removeItem = (cartId: string) => setItems(prev => prev.filter(i => i.cartId !== cartId));
  const updateItem = (cartId: string, updatedItem: OrderItem) => 
    setItems(prev => prev.map(item => item.cartId === cartId ? updatedItem : item));

  const loadOrderForEditing = (order: any) => {
    setEditingOrderId(order.id);
    setMode(order.mode || 'immediate');
    setClient({
        id: order.client?.id,
        name: order.client?.name,
        phone: order.client?.phone || (order.client?.phones?.[0]?.phoneNumber),
        address: order.client?.addresses?.[0]?.address,
        latitude: order.client?.addresses?.[0]?.latitude ? parseFloat(order.client.addresses[0].latitude) : undefined,
        longitude: order.client?.addresses?.[0]?.longitude ? parseFloat(order.client.addresses[0].longitude) : undefined
    });
    setDeliveryType(order.deliveryType);
    setLivreur(order.livreur?.id || null);
    setScheduledDate(order.scheduledPickupDate);
    setOrderNotes(order.notes || '');
    setOrderImages((order.images || []).filter((img: any) => !img.tapisId).map((img: any) => img.imageUrl));
    setPaymentMethod(order.modePaiement);
    setPaidAmount(parseFloat(order.montantPaye || 0));
    
    // Map items
    const mappedItems: OrderItem[] = (order.commandeTapis || []).map((t: any) => ({
        cartId: `edit_${t.id}`,
        productId: t.productId,
        nom: t.productNom,
        quantite: t.quantite,
        largeur: t.largeur ? parseFloat(t.largeur) : undefined,
        hauteur: t.hauteur ? parseFloat(t.hauteur) : undefined,
        longueur: t.longueur ? parseFloat(t.longueur) : undefined,
        poids: t.poids ? parseFloat(t.poids) : undefined,
        prixUnitaire: parseFloat(t.prixUnitaire),
        prixFinal: parseFloat(t.prixFinal),
        remiseMontant: parseFloat(t.remiseMontant || 0),
        remiseRaison: t.remiseRaison,
        couleur: t.couleur,
        notes: t.notes,
        pricingMethod: t.productPricingMethod,
        imageUrls: (t.images || []).map((img: any) => img.imageUrl) // Remote URLs will be kept as strings
    }));
    setItems(mappedItems);
  };

  const clearOrder = () => {
    setMode(null);
    setClient(null);
    setDeliveryType(null);
    setLivreur(null);
    setScheduledDate(null);
    setItems([]);
    setOrderNotes('');
    setOrderImages([]);
    setPaymentMethod(null);
    setPaidAmount(0);
    setPendingLocation(null);
    setEditingOrderId(null);
  };

  const value = {
    mode, client, deliveryType, livreurId, scheduledDate, items, orderNotes, orderImages, paymentMethod, paidAmount, pendingLocation, editingOrderId,
    setMode, setClient, setDeliveryType, setLivreur, setScheduledDate,
    addItem, removeItem, updateItem, setOrderNotes, setOrderImages, setPaymentMethod, setPaidAmount, setPendingLocation, setEditingOrderId,
    loadOrderForEditing, clearOrder,
    totalAmount, itemCount, totalArea, totalCarpets, remainingAmount
  };

  return <OrderCreationContext.Provider value={value}>{children}</OrderCreationContext.Provider>;
};

export const useOrderCreation = () => {
  const context = useContext(OrderCreationContext);
  if (!context) throw new Error('useOrderCreation must be used within an OrderCreationProvider');
  return context;
};
