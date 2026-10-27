import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";

export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json();
    const store = getStore();

    let staff = store.staff.find((s) => s.email === email && s.isActive);

    if (!staff) {
      // Allow convenience login if credentials match role pattern
      if (role && (role === "admin" || role === "waiter" || role === "kitchen")) {
        staff = store.staff.find((s) => s.role === role);
      }
    }

    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Invalid staff credentials or account is inactive." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        displayName: staff.displayName,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
