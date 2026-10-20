import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("YourContract", {
      account: deployer,
      artifact: artifacts.YourContract,
      args: [deployer],
    });
  },
  { tags: ["YourContract"] },
);
