require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    vechain_testnet: {
      url: "https://testnet.veblocks.net",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  }
};
