import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";
import { Staff } from "@/types";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, displayName, uid, photoURL, requestedRole } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const store = getStore();
    let staff = store.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());

    if (!staff) {
      // Auto-assign or respect requestedRole, default to admin if it's the restaurant owner or staff
      const assignedRole = requestedRole || (store.staff.length === 0 ? "admin" : "admin");
      staff = {
        id: uid ? `staff_${uid}` : `staff_${Date.now()}`,
        restaurantId: store.restaurant.id,
        displayName: displayName || email.split("@")[0],
        email: email.toLowerCase(),
        role: assignedRole,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.staff.push(staff);

      // Save to Cloud Firestore
      try {
        await adminDb.collection("staff").doc(staff.id).set(staff, { merge: true });
      } catch (e) {
        console.warn("Could not save Google user to Firestore:", e);
      }
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
