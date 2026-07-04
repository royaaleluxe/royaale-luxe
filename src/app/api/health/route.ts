import { NextResponse } from "next/server";
import { isAdminSdkConfigured } from "@/lib/firebase-admin";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "royaale-luxe-api",
    siteMode: process.env.NEXT_PUBLIC_SITE_MODE ?? "storefront",
    adminSdk: isAdminSdkConfigured(),
  });
}
