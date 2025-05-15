import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin'; // Updated import path
import { getProvider, getContract } from '@/bchain/config';
import { keccak256, toUtf8Bytes } from 'ethers';
import { QuerySnapshot, DocumentData } from 'firebase-admin/firestore'; // Add these imports

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const { hash } = await request.json();

      // Create bytes32 hash using ethers v6 method
      const bytes32Hash = keccak256(toUtf8Bytes(hash));

      // Check both Firebase and Blockchain
      const [firebaseExists, blockchainExists] = await Promise.all([
        // Check Firebase
        adminDb.collection('prescriptionHashes')
          .where('hash', '==', hash)
          .get()
          .then((snapshot: QuerySnapshot<DocumentData>) => !snapshot.empty),
        
        // Check Blockchain with updated method
        getContract(getProvider())
          .checkPrescription(bytes32Hash)
      ]);

      return NextResponse.json({
        exists: firebaseExists || blockchainExists,
        message: firebaseExists || blockchainExists 
          ? "This prescription has already been registered." 
          : null
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      return NextResponse.json(
        { error: 'Verification failed' }, 
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
