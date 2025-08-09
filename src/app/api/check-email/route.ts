import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: Request) {
  const { email } = await req.json();

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return NextResponse.json({ exists: true, uid: userRecord.uid });
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
