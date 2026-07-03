const hre = require("hardhat");

async function main() {
  const DesignRegistry = await hre.ethers.getContractFactory("DesignRegistry");
  console.log("Deploying DesignRegistry...");
  
  const registry = await DesignRegistry.deploy();
  await registry.waitForDeployment();
  
  console.log("DesignRegistry successfully deployed to:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
