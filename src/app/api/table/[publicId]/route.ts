import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const store = getStore();
    const table = store.tables.find((t) => t.publicId === publicId && t.isActive);

    if (!table) {
      return NextResponse.json(
        { success: false, error: "Invalid or inactive table QR code." },
        { status: 404 }
      );
    }

    const currentSession = table.activeSessionId
      ? store.sessions.find((s) => s.id === table.activeSessionId)
      : null;

    return NextResponse.json({
      success: true,
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        capacity: table.capacity,
        publicId: table.publicId,
        status: table.status,
        hasActiveSession: !!currentSession && currentSession.status !== "closed",
        activeSessionId: table.activeSessionId,
      },
      restaurant: store.restaurant,
      categories: store.categories.filter((c) => c.isActive),
      menuItems: store.menuItems.filter((i) => i.isAvailable),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
