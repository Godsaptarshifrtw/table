import { z } from "zod";

export const CreateOrderRequestItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  specialInstructions: z.string().max(200).optional(),
});

export const CreateOrderRequestSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  tablePublicId: z.string().min(1, "Table ID is required"),
  items: z.array(CreateOrderRequestItemSchema).min(1, "At least one item is required to place an order"),
  source: z.enum(["qr", "waiter"]).default("qr"),
  specialInstructions: z.string().max(500).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdateItemStatusSchema = z.object({
  orderId: z.string().min(1),
  itemId: z.string().min(1),
  newStatus: z.enum(["pending", "preparing", "ready", "served", "cancelled"]),
  staffId: z.string().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["submitted", "acknowledged", "preparing", "partially_ready", "ready", "served", "cancelled"]),
});

export const BillRequestSchema = z.object({
  sessionId: z.string().min(1),
  paymentMethod: z.enum(["cash", "card", "qr_online"]).default("cash"),
});

export const CloseSessionSchema = z.object({
  sessionId: z.string().min(1),
  tableId: z.string().min(1),
  closedByStaffId: z.string().min(1),
  paymentMethod: z.enum(["cash", "card", "qr_online"]),
  paymentStatus: z.enum(["paid", "pending"]),
  discount: z.number().nonnegative().default(0),
});

export const TableManagementSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  displayName: z.string().min(1, "Display name is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  assignedWaiterId: z.string().nullable().optional(),
  assignedWaiterName: z.string().nullable().optional(),
  status: z.enum(["available", "occupied", "awaiting_bill", "payment_pending", "cleaning"]).default("available"),
});

export const MenuItemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Item name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be greater than zero"),
  foodType: z.enum(["veg", "non-veg", "vegan", "beverage"]),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url().optional().or(z.literal("")),
  prepTimeMinutes: z.number().int().positive().optional(),
});
