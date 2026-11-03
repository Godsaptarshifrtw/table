import { adminDb } from "@/lib/firebase/admin";
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

export async function syncFirestoreWithStore(): Promise<void> {
  if (initializedFirestore) return;
  try {
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
        store.tables = tablesSnap.docs.map((d) => d.data() as Table);
      }

      const menuSnap = await adminDb.collection("menuItems").get();
      if (!menuSnap.empty) {
        store.menuItems = menuSnap.docs.map((d) => d.data() as MenuItem);
      }

      const ordersSnap = await adminDb.collection("orders").orderBy("createdAt", "desc").limit(100).get();
      if (!ordersSnap.empty) {
        store.orders = ordersSnap.docs.map((d) => d.data() as Order);
      }
    }

    initializedFirestore = true;
  } catch (err) {
    console.warn("[Firestore sync warning] Using memory fallback if offline/no service-account credentials:", err);
    // Graceful fallback so the system is always 100% resilient
    initializedFirestore = true;
  }
}

// Helpers to persist mutations to Firestore in background
export async function persistOrderToFirestore(order: Order, session?: TableSession): Promise<void> {
  try {
    const batch = adminDb.batch();
    const orderRef = adminDb.collection("orders").doc(order.id);
    batch.set(orderRef, order);

    if (session) {
      const sessRef = adminDb.collection("tableSessions").doc(session.id);
      batch.set(sessRef, session);
    }
    await batch.commit();
  } catch (err) {
    console.warn("Could not write order to Firestore directly:", err);
  }
}

export async function persistTableToFirestore(table: Table): Promise<void> {
  try {
    await adminDb.collection("tables").doc(table.id).set(table, { merge: true });
  } catch (err) {
    console.warn("Could not update table in Firestore:", err);
  }
}

export async function persistSessionToFirestore(session: TableSession): Promise<void> {
  try {
    await adminDb.collection("tableSessions").doc(session.id).set(session, { merge: true });
  } catch (err) {
    console.warn("Could not update session in Firestore:", err);
  }
}

export async function persistAuditLogToFirestore(log: AuditLog): Promise<void> {
  try {
    await adminDb.collection("auditLogs").doc(log.id).set(log);
  } catch (err) {
    console.warn("Could not save auditLog:", err);
  }
}
