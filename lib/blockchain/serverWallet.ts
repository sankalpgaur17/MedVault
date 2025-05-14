import { ethers } from "ethers";

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

export const provider = new ethers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`
);

// Server wallet that will handle all transactions
export const serverWallet = new ethers.Wallet('678b51b829428d46444dba01f8bf06d99a007dea0a6e7cdbbac69357c8170025');
