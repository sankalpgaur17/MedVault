import { ethers } from 'ethers';
import PrescriptionRegistry from '../contracts/PrescriptionRegistry.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const INFURA_URL = process.env.NEXT_PUBLIC_INFURA_URL;

export const getBlockchainProvider = () => {
  // For read operations, use Infura
  return new ethers.providers.JsonRpcProvider(INFURA_URL);
};

export const getContract = (signer?: ethers.Signer) => {
  const provider = getBlockchainProvider();
  return new ethers.Contract(
    CONTRACT_ADDRESS!,
    PrescriptionRegistry.abi,
    signer || provider
  );
};

export const registerPrescriptionOnChain = async (hash: string) => {
  try {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    // Get user's MetaMask account
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Get contract with signer
    const contract = getContract(signer);
    
    // Convert hash to bytes32
    const bytes32Hash = ethers.utils.id(hash);
    
    // Register prescription
    const tx = await contract.registerPrescription(bytes32Hash);
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error("Blockchain registration error:", error);
    throw error;
  }
};

export const verifyPrescriptionOnChain = async (hash: string): Promise<boolean> => {
  try {
    const contract = getContract();
    const bytes32Hash = ethers.utils.id(hash);
    return await contract.verifyPrescription(bytes32Hash);
  } catch (error) {
    console.error("Blockchain verification error:", error);
    throw error;
  }
};
