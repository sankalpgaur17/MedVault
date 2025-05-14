import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { firestore } from 'firebase-admin';

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];

    try {
      // Verify the token using Firebase Admin
      const decodedToken = await adminAuth.verifyIdToken(token);
      const { hash } = await request.json();

      // Use admin Firestore instance to check prescriptionHashes
      const hashesRef = adminDb.collection('prescriptionHashes');
      // Use firestore.where instead of direct where import
      const q = hashesRef.where('hash', '==', hash);
      const snapshot = await q.get();

      if (!snapshot.empty) {
        return NextResponse.json({
          exists: true,
          message: "This prescription has already been registered."
        });
      }

      return NextResponse.json({ exists: false });

    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

  } catch (error: any) {
    console.error('Error verifying prescription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
