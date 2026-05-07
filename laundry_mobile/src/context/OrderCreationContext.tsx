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
  paymentMethod: string | null;
  paidAmount: number;
  pendingLocation: PendingLocation | null;
  
  setMode: (mode: OrderMode | null) => void;
  setClient: (client: ClientData | null) => void;
  setDeliveryType: (type: string | null) => void;
  setLivreur: (id: number | null) => void;
  setScheduledDate: (date: string | null) => void;
  addItem: (item: OrderItem) => void;
  removeItem: (cartId: string) => void;
  updateItem: (cartId: string, item: OrderItem) => void;
  setOrderNotes: (notes: string) => void;
  setPaymentMethod: (method: string | null) => void;
  setPaidAmount: (amount: number) => void;
  setPendingLocation: (loc: PendingLocation | null) => void;
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
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);

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

  const clearOrder = () => {
    setMode(null);
    setClient(null);
    setDeliveryType(null);
    setLivreur(null);
    setScheduledDate(null);
    setItems([]);
    setOrderNotes('');
    setPaymentMethod(null);
    setPaidAmount(0);
    setPendingLocation(null);
  };

  const value = {
    mode, client, deliveryType, livreurId, scheduledDate, items, orderNotes, paymentMethod, paidAmount, pendingLocation,
    setMode, setClient, setDeliveryType, setLivreur, setScheduledDate,
    addItem, removeItem, updateItem, setOrderNotes, setPaymentMethod, setPaidAmount, setPendingLocation, clearOrder,
    totalAmount, itemCount, totalArea, totalCarpets, remainingAmount
  };

  return <OrderCreationContext.Provider value={value}>{children}</OrderCreationContext.Provider>;
};

export const useOrderCreation = () => {
  const context = useContext(OrderCreationContext);
  if (!context) throw new Error('useOrderCreation must be used within an OrderCreationProvider');
  return context;
};
