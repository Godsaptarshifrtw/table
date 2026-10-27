export type UserRole = "admin" | "waiter" | "kitchen" | "customer";

export type TableStatus = "available" | "occupied" | "awaiting_bill" | "payment_pending" | "cleaning";

export type SessionStatus = "open" | "bill_requested" | "payment_pending" | "closed";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type OrderSource = "qr" | "waiter";

export type OrderOverallStatus = "submitted" | "acknowledged" | "preparing" | "partially_ready" | "ready" | "served" | "cancelled";

export type ItemPreparationStatus = "pending" | "preparing" | "ready" | "served" | "cancelled";

export type FoodType = "veg" | "non-veg" | "vegan" | "beverage";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  address?: string;
  timezone: string;
  currency: string;
  taxRate: number; // e.g. 0.08 for 8%
  settings: {
    allowCustomerOrdering: boolean;
    autoAcknowledgeOrders: boolean;
    kitchenAlertSound: boolean;
    estimatedPrepTimeMinutes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  displayName: string;
  capacity: number;
  publicId: string; // Opaque non-sequential URL token e.g. "tbl_x7k9p2"
  status: TableStatus;
  assignedWaiterId?: string | null;
  assignedWaiterName?: string | null;
  activeSessionId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  currency: string;
  foodType: FoodType;
  isAvailable: boolean;
  preparationMetadata?: {
    avgPrepTimeMinutes?: number;
    spiceLevel?: "none" | "mild" | "medium" | "hot";
    allergens?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface TableSession {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumberSnapshot: string;
  status: SessionStatus;
  assignedWaiterId?: string | null;
  openedAt: string;
  closedAt?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: "cash" | "card" | "qr_online" | null;
  createdBy: string; // "qr_customer" or staffId
  closedBy?: string | null;
  orderCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  lineTotal: number;
  specialInstructions?: string;
  preparationStatus: ItemPreparationStatus;
  preparedAt?: string | null;
  servedAt?: string | null;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumberSnapshot: string;
  sessionId: string;
  orderNumber: string; // e.g. "#1024"
  source: OrderSource;
  status: OrderOverallStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  specialInstructions?: string;
  createdBy: string; // "customer" or staffId
  idempotencyKey?: string;
  createdAt: string;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  servedAt?: string | null;
  cancelledAt?: string | null;
  updatedAt?: string;
}

export interface Staff {
  id: string;
  restaurantId: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  restaurantId: string;
  sessionId: string;
  orderIds: string[];
  amount: number;
  currency: string;
  method: "cash" | "card" | "qr_online";
  status: PaymentStatus;
  providerReference?: string;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface AuditLog {
  id: string;
  restaurantId: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  resourceType: "order" | "table" | "session" | "menu" | "staff" | "payment";
  resourceId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
