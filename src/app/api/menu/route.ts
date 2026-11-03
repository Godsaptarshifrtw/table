import { NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";
import { syncFirestoreWithStore } from "@/lib/firestoreService";

export async function GET() {
  try {
    await syncFirestoreWithStore().catch(console.error);
    const store = getStore();
    return NextResponse.json({
      success: true,
      restaurant: store.restaurant,
      categories: store.categories.filter((c) => c.isActive),
      menuItems: store.menuItems,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
