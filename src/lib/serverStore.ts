import {
  Restaurant,
  Table,
  MenuCategory,
  MenuItem,
  TableSession,
  Order,
  Staff,
  AuditLog,
} from "@/types";

export interface DatabaseState {
  restaurant: Restaurant;
  tables: Table[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  sessions: TableSession[];
  orders: Order[];
  staff: Staff[];
  auditLogs: AuditLog[];
}

const initialRestaurant: Restaurant = {
  id: "rest_default_01",
  name: "Gourmet Bistro & Grill",
  slug: "gourmet-bistro",
  logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=120&auto=format&fit=crop&q=80",
  address: "42 Culinary Avenue, Tech City",
  timezone: "UTC",
  currency: "USD",
  taxRate: 0.08, // 8%
  settings: {
    allowCustomerOrdering: true,
    autoAcknowledgeOrders: true,
    kitchenAlertSound: true,
    estimatedPrepTimeMinutes: 20,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const initialCategories: MenuCategory[] = [
  {
    id: "cat_starters",
    restaurantId: "rest_default_01",
    name: "Starters & Appetizers",
    description: "Crispy, savory snacks to begin your meal",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat_mains",
    restaurantId: "rest_default_01",
    name: "Chef's Mains",
    description: "Artisanal mains freshly prepared on order",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat_drinks",
    restaurantId: "rest_default_01",
    name: "Beverages & Mocktails",
    description: "Cold-pressed juices, sodas, and mocktails",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat_desserts",
    restaurantId: "rest_default_01",
    name: "Desserts",
    description: "Sweet, handcrafted delicacies",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialMenuItems: MenuItem[] = [
  {
    id: "item_truffle_fries",
    restaurantId: "rest_default_01",
    categoryId: "cat_starters",
    name: "Crispy Truffle Fries",
    description: "Hand-cut Idaho potatoes tossed with white truffle oil, rosemary & shaved parmesan.",
    imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80",
    price: 9.5,
    currency: "USD",
    foodType: "veg",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 10, spiceLevel: "none", allergens: ["Dairy"] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item_chicken_wings",
    restaurantId: "rest_default_01",
    categoryId: "cat_starters",
    name: "Smoked Honey Chipotle Wings",
    description: "Crispy drumettes glazed with smokey chipotle pepper honey and blue cheese dip.",
    imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=80",
    price: 13.0,
    currency: "USD",
    foodType: "non-veg",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 15, spiceLevel: "medium" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item_artisan_burger",
    restaurantId: "rest_default_01",
    categoryId: "cat_mains",
    name: "Prime Wagyu Bacon Burger",
    description: "Brioche bun, charred grass-fed patty, aged cheddar, caramelized shallots, house garlic aioli.",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
    price: 18.5,
    currency: "USD",
    foodType: "non-veg",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 18, spiceLevel: "mild", allergens: ["Gluten", "Dairy"] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item_wild_mushroom_risotto",
    restaurantId: "rest_default_01",
    categoryId: "cat_mains",
    name: "Forest Mushroom Risotto",
    description: "Arborio rice slowly simmered with porcini stock, thyme, mascarpone, and truffle butter.",
    imageUrl: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=500&auto=format&fit=crop&q=80",
    price: 16.5,
    currency: "USD",
    foodType: "veg",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 20, spiceLevel: "none", allergens: ["Dairy"] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item_salmon_grilled",
    restaurantId: "rest_default_01",
    categoryId: "cat_mains",
    name: "Pan-Seared Atlantic Salmon",
    description: "Served on crushed baby potatoes, asparagus spears with lemon dill beurre blanc.",
    imageUrl: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=500&auto=format&fit=crop&q=80",
    price: 22.0,
    currency: "USD",
    foodType: "non-veg",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 22, spiceLevel: "none", allergens: ["Fish", "Dairy"] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item_berry_lemonade",
    restaurantId: "rest_default_01",
    categoryId: "cat_drinks",
    name: "Sparkling Berry Basil Lemonade",
    description: "Muddled wild blackberries, fresh lime juice, organic basil and sparkling soda.",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80",
    price: 5.5,
    currency: "USD",
    foodType: "vegan",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 5, spiceLevel: "none" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item_iced_matcha",
    restaurantId: "rest_default_01",
    categoryId: "cat_drinks",
    name: "Iced Oat Milk Matcha Latte",
    description: "Ceremonial grade Uji matcha whisked with Madagascar vanilla and cold oat milk.",
    imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80",
    price: 6.0,
    currency: "USD",
    foodType: "vegan",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 5, spiceLevel: "none" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item_lava_cake",
    restaurantId: "rest_default_01",
    categoryId: "cat_desserts",
    name: "Molten Valrhona Chocolate Cake",
    description: "Warm dark chocolate center served with Madagascar bourbon vanilla bean gelato.",
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80",
    price: 8.5,
    currency: "USD",
    foodType: "veg",
    isAvailable: true,
    preparationMetadata: { avgPrepTimeMinutes: 12, spiceLevel: "none", allergens: ["Dairy", "Eggs", "Gluten"] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialTables: Table[] = [
  {
    id: "tbl_01",
    restaurantId: "rest_default_01",
    tableNumber: "01",
    displayName: "Table 01 (Window)",
    capacity: 2,
    publicId: "tbl_pub_01",
    status: "available",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tbl_02",
    restaurantId: "rest_default_01",
    tableNumber: "02",
    displayName: "Table 02 (Center Booth)",
    capacity: 4,
    publicId: "tbl_pub_02",
    status: "available",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tbl_03",
    restaurantId: "rest_default_01",
    tableNumber: "03",
    displayName: "Table 03 (Garden View)",
    capacity: 4,
    publicId: "tbl_pub_03",
    status: "available",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tbl_04",
    restaurantId: "rest_default_01",
    tableNumber: "04",
    displayName: "Table 04 (Family Round)",
    capacity: 6,
    publicId: "tbl_pub_04",
    status: "available",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tbl_05",
    restaurantId: "rest_default_01",
    tableNumber: "05",
    displayName: "Table 05 (VIP Lounge)",
    capacity: 4,
    publicId: "tbl_pub_05",
    status: "available",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialStaff: Staff[] = [
  {
    id: "staff_admin",
    restaurantId: "rest_default_01",
    displayName: "Elena Rostova (General Manager)",
    email: "admin@restaurant.com",
    role: "admin",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "staff_waiter_01",
    restaurantId: "rest_default_01",
    displayName: "Marco Silva (Senior Waiter)",
    email: "waiter@restaurant.com",
    role: "waiter",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "staff_kitchen_01",
    restaurantId: "rest_default_01",
    displayName: "Chef Pierre (Head Chef)",
    email: "kitchen@restaurant.com",
    role: "kitchen",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-Memory store attached to globalThis in Node so all API routes and handlers share persistent state
declare global {
  // eslint-disable-next-line no-var
  var __RESTAURANT_STORE__: DatabaseState | undefined;
}

if (!globalThis.__RESTAURANT_STORE__) {
  globalThis.__RESTAURANT_STORE__ = {
    restaurant: initialRestaurant,
    tables: initialTables,
    categories: initialCategories,
    menuItems: initialMenuItems,
    sessions: [],
    orders: [],
    staff: initialStaff,
    auditLogs: [],
  };
}

export const memoryStore = globalThis.__RESTAURANT_STORE__;

export function getStore(): DatabaseState {
  return globalThis.__RESTAURANT_STORE__!;
}
