import { ethers } from 'ethers';
import PrescriptionRegistry from './artifacts/contracts/PrescriptionRegistry.sol/PrescriptionRegistry.json';
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Contract deployed on Sepolia testnet
const CONTRACT_ADDRESS = "0x0E3F5F49387d5402A5ec3A787310fDb6a9DD211C";
const INFURA_PROJECT_ID = "c568da8023ca48f1a32cf19e13253e65";

// Setup provider and contract
export const getProvider = () => {
  return new ethers.InfuraProvider('sepolia', INFURA_PROJECT_ID);
};

export const getContract = (signerOrProvider: ethers.Signer | ethers.Provider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    PrescriptionRegistry.abi,
    signerOrProvider
  );
};

// Function to get signer from MetaMask
export const getSigner = async () => {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
};
