import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Received token:', token); // Debug log

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Decoded token:', decodedToken); // Debug log
      
      const { hash } = await request.json();
      console.log('Received hash:', hash); // Debug log

      const hashesRef = adminDb.collection('prescriptionHashes');
      const querySnapshot = await hashesRef
        .where('hash', '==', hash)
        .limit(1)
        .get();

      return NextResponse.json({
        exists: !querySnapshot.empty,
        message: querySnapshot.empty ? null : "This prescription has already been registered."
      });

    } catch (error: any) {
      console.error('Token verification error details:', error); // Enhanced error logging
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
  } catch (error: any) {
    console.error('Server error details:', error); // Enhanced error logging
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
