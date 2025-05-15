// This is the core file that handles blockchain interactions
import { ethers } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers";
import { serverWallet } from "../blockchain/serverWallet";
import { parseISO, isBefore, isValid } from 'date-fns';
import { createHash } from 'crypto';
import { registerPrescriptionOnChain, verifyPrescriptionOnChain } from '../blockchain';
import { checkFirebaseHash } from '../firebase/prescriptions';
import { bchainContract } from '@/bchain/config'; // Import your existing contract configuration

// Directly including the ABI in the code
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

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

// Get contract instance using server wallet
const getContract = async () => {
  return new ethers.Contract(contractAddress, abi, serverWallet);
};

// Create hash from image content instead of metadata
export const createPrescriptionHash = async (imageBuffer: Buffer): Promise<string> => {
  try {
    // Create hash from image content only
    const hash = createHash('sha256');
    hash.update(imageBuffer);
    return hash.digest('hex');
  } catch (error) {
    console.error('Error creating prescription hash:', error);
    throw error;
  }
};

// Add a helper function to extract and validate prescription date
export const getPrescriptionDate = (prescriptionData: any): Date => {
  // Try to get date from extracted medicines first
  if (prescriptionData.medicines?.[0]?.prescribedDate) {
    const extractedDate = parseISO(prescriptionData.medicines[0].prescribedDate);
    if (!isNaN(extractedDate.getTime())) {
      return extractedDate;
    }
  }
  
  // Fallback to form date if no valid extracted date
  return parseISO(prescriptionData.date);
};

// Verify prescription uniqueness through API
export const verifyPrescriptionUniqueness = async (hash: string): Promise<boolean> => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = bchainContract.connect(provider);
    const bytes32Hash = ethers.utils.id(hash);
    
    // Use your existing contract's verify method
    return await contract.verifyPrescription(bytes32Hash);
  } catch (error) {
    console.error('Error verifying prescription:', error);
    throw error;
  }
};

// Register prescription through API
export const registerPrescription = async (hash: string): Promise<void> => {
  try {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = bchainContract.connect(signer);

    // Convert hash to bytes32
    const bytes32Hash = ethers.utils.id(hash);
    
    // Register prescription using your existing contract
    const tx = await contract.registerPrescription(bytes32Hash);
    await tx.wait();

  } catch (error) {
    console.error('Error registering prescription:', error);
    throw error;
  }
};

export const calculateRemainingDays = (startDateStr: string | Date | null, duration: number | null): number => {
  if (!startDateStr || !duration) return 0;

  let startDate: Date;
  if (typeof startDateStr === 'string') {
    startDate = parseISO(startDateStr);
    if (!isValid(startDate)) return 0;
  } else {
    startDate = startDateStr;
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return remaining > 0 ? remaining : 0;
};
