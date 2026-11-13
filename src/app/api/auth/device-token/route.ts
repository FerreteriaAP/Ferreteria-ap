import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDeviceToken } from "@/lib/device-token";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 400 });
  }
  const token = createDeviceToken(userId);
  return NextResponse.json({ token });
}
