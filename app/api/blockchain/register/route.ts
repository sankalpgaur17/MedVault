import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID!;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY!;

const provider = new ethers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`
);

const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

const abi = [
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "prescriptionHash",
          "type": "bytes32"
        }
      ],
      "name": "addPrescription",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "prescriptionHash",
          "type": "bytes32"
        }
      ],
      "name": "checkPrescription",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

export async function POST(req: Request) {
  try {
    const { hash } = await req.json();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    const tx = await contract.addPrescription(hash);
    await tx.wait();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Blockchain registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register prescription' },
      { status: 500 }
    );
  }
}
