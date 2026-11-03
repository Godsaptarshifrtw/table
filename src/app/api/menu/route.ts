import { NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";
import { syncFirestoreWithStore } from "@/lib/firestoreService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    try {
      await syncFirestoreWithStore();
    } catch (e) {
      console.warn("Firestore sync skipped:", e);
    }
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { itemId, isAvailable, price, name, description } = body;
    if (!itemId) {
      return NextResponse.json({ success: false, error: "itemId is required" }, { status: 400 });
    }

    const store = getStore();
    const item = store.menuItems.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json({ success: false, error: "Menu item not found" }, { status: 404 });
    }

    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    if (price !== undefined) item.price = Number(price);
    if (name) item.name = name;
    if (description) item.description = description;
    item.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: "Item updated successfully",
      item,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
