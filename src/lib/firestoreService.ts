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
import { getStore } from "./serverStore";

/**
 * Service to sync in-memory changes with Cloud Firestore (table-b3614)
 * and seed initial restaurant documents if empty.
 */

let initializedFirestore = false;

async function getAdminModule() {
  try {
    const admin = await import("@/lib/firebase/admin");
    if (admin && admin.isFirebaseAdminConfigured && admin.adminDb && typeof admin.adminDb.collection === "function") {
      return admin;
    }
  } catch (err) {
    // Graceful fallback to memory store if running in serverless without native credentials
  }
  return null;
}

export async function syncFirestoreWithStore(): Promise<void> {
  if (initializedFirestore) return;

  try {
    const admin = await getAdminModule();
    if (!admin) {
      initializedFirestore = true;
      return;
    }

    const adminDb = admin.adminDb;
    const restDoc = await adminDb.collection("restaurants").doc("rest_default_01").get();
    const store = getStore();

    if (!restDoc.exists) {
      console.log("[Firestore] Seeding initial restaurant data to table-b3614...");
      const batch = adminDb.batch();

      // Seed restaurant
      const restRef = adminDb.collection("restaurants").doc(store.restaurant.id);
      batch.set(restRef, store.restaurant);

      // Seed tables
      for (const table of store.tables) {
        const tableRef = adminDb.collection("tables").doc(table.id);
        batch.set(tableRef, table);
      }

      // Seed categories
      for (const cat of store.categories) {
        const catRef = adminDb.collection("menuCategories").doc(cat.id);
        batch.set(catRef, cat);
      }

      // Seed menu items
      for (const item of store.menuItems) {
        const itemRef = adminDb.collection("menuItems").doc(item.id);
        batch.set(itemRef, item);
      }

      // Seed staff
      for (const s of store.staff) {
        const staffRef = adminDb.collection("staff").doc(s.id);
        batch.set(staffRef, s);
      }

      await batch.commit();
      console.log("[Firestore] Seeding complete!");
    } else {
      // Pull latest from Firestore if exists
      const restData = restDoc.data() as Restaurant;
      if (restData) store.restaurant = restData;

      const tablesSnap = await adminDb.collection("tables").get();
      if (!tablesSnap.empty) {
        store.tables = tablesSnap.docs.map((d: any) => d.data() as Table);
      }

      const menuSnap = await adminDb.collection("menuItems").get();
      if (!menuSnap.empty) {
        const fetchedItems = menuSnap.docs.map((d: any) => d.data() as MenuItem);
        const hasOutdatedData = fetchedItems.some(
          (item) => !item.currency || item.currency === "USD" || item.price < 50
        );
        if (hasOutdatedData) {
          console.log("[Firestore] Updating menu items in Firestore to INR pricing...");
          const batch = adminDb.batch();
          for (const item of store.menuItems) {
            const itemRef = adminDb.collection("menuItems").doc(item.id);
            batch.set(itemRef, item);
          }
          await batch.commit();
        } else {
          store.menuItems = fetchedItems;
        }
      }

      const ordersSnap = await adminDb.collection("orders").orderBy("createdAt", "desc").limit(100).get();
      if (!ordersSnap.empty) {
        store.orders = ordersSnap.docs.map((d: any) => d.data() as Order);
      }
    }

    initializedFirestore = true;
  } catch (err) {
    console.warn("[Firestore sync note] Operating in high-speed local memory store mode.");
    initializedFirestore = true;
  }
}

// Helpers to persist mutations to Firestore in background
export async function persistOrderToFirestore(order: Order, session?: TableSession): Promise<void> {
  try {
    const admin = await getAdminModule();
    if (!admin) return;

    const batch = admin.adminDb.batch();
    const orderRef = admin.adminDb.collection("orders").doc(order.id);
    batch.set(orderRef, order);

    if (session) {
      const sessRef = admin.adminDb.collection("tableSessions").doc(session.id);
      batch.set(sessRef, session);
    }
    await batch.commit();
  } catch (err) {
    console.warn("Could not write order to Firestore directly:", err);
  }
}

export async function persistTableToFirestore(table: Table): Promise<void> {
  try {
    const admin = await getAdminModule();
    if (!admin) return;
    await admin.adminDb.collection("tables").doc(table.id).set(table, { merge: true });
  } catch (err) {
    console.warn("Could not update table in Firestore:", err);
  }
}

export async function persistSessionToFirestore(session: TableSession): Promise<void> {
  try {
    const admin = await getAdminModule();
    if (!admin) return;
    await admin.adminDb.collection("tableSessions").doc(session.id).set(session, { merge: true });
  } catch (err) {
    console.warn("Could not update session in Firestore:", err);
  }
}

export async function persistAuditLogToFirestore(log: AuditLog): Promise<void> {
  try {
    const admin = await getAdminModule();
    if (!admin) return;
    await admin.adminDb.collection("auditLogs").doc(log.id).set(log);
  } catch (err) {
    console.warn("Could not save auditLog:", err);
  }
}
