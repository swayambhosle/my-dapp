import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async ({ deploy, namedAccounts, network }) => {
    const { deployer } = namedAccounts;
    const configuredOwner = process.env.DELEGATION_OWNER_ADDRESS;
    if (network.chain.id === 84532 && !configuredOwner) {
      throw new Error("Set DELEGATION_OWNER_ADDRESS to the intended Base Sepolia owner before deploying");
    }
    if (configuredOwner && !/^0x[a-fA-F0-9]{40}$/.test(configuredOwner)) {
      throw new Error("DELEGATION_OWNER_ADDRESS must be a valid 20-byte EVM address");
    }
    const initialOwner = (configuredOwner ?? deployer) as `0x${string}`;
    if (network.chain.id === 84532 && initialOwner.toLowerCase() !== deployer.toLowerCase()) {
      throw new Error("Base Sepolia deployment signer must match DELEGATION_OWNER_ADDRESS");
    }

    await deploy("YourContract", {
      account: deployer,
      artifact: artifacts.YourContract,
      args: [initialOwner],
    });
  },
  { tags: ["YourContract"] },
);
