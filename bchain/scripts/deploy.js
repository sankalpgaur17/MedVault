const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const Registry = await hre.ethers.getContractFactory("PrescriptionRegistry");

  // Deploy the contract
  const registry = await Registry.deploy();

  // Wait for deployment to be mined
  await registry.waitForDeployment(); // ✅ modern ethers.js way

  // Get deployed address
  const address = await registry.getAddress();
  console.log("✅ Contract deployed at address:", address);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
