import { expect } from "chai";
import { network } from "hardhat";
import type { Abi_YourContract } from "../generated/abis/YourContract.js";
import { loadAndExecuteDeploymentsFromFiles } from "../rocketh/environment.js";

const { provider, networkHelpers, ethers } = await network.create();

// We define a fixture to reuse the same setup in every test.
async function deployFixture() {
  const env = await loadAndExecuteDeploymentsFromFiles({ provider });
  const { address, abi } = env.get<Abi_YourContract>("YourContract");
  const yourContract = await ethers.getContractAt(abi, address);
  return { env, yourContract };
}

describe("YourContract", function () {
  describe("Deployment", function () {
    it("Should set the deployer as the owner", async function () {
      const { env, yourContract } = await networkHelpers.loadFixture(deployFixture);
      const deployer = env.namedAccounts.deployer;
      expect(await yourContract.owner()).to.equal(deployer);
    });

    it("Should set the initial delegate to the owner", async function () {
      const { env, yourContract } = await networkHelpers.loadFixture(deployFixture);
      const deployer = env.namedAccounts.deployer;
      expect(await yourContract.delegate()).to.equal(deployer);
    });
  });

  describe("setDelegate", function () {
    it("Should allow the owner to change the delegate", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const newDelegate = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

      await yourContract.setDelegate(newDelegate);
      expect(await yourContract.delegate()).to.equal(newDelegate);
    });

    it("Should emit a DelegateChanged event", async function () {
      const { env, yourContract } = await networkHelpers.loadFixture(deployFixture);
      const deployer = env.namedAccounts.deployer;
      const newDelegate = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

      await expect(yourContract.setDelegate(newDelegate))
        .to.emit(yourContract, "DelegateChanged")
        .withArgs(deployer, newDelegate);
    });

    it("Should reject the zero address", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const zeroAddress = "0x0000000000000000000000000000000000000000";

      await expect(yourContract.setDelegate(zeroAddress)).to.be.revertedWith("Delegate cannot be zero address");
    });

    it("Should reject calls from non-owner", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const [, nonOwner] = await ethers.getSigners();
      const newDelegate = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

      await expect(yourContract.connect(nonOwner).setDelegate(newDelegate)).to.be.revertedWith(
        "Only the owner can change the delegate",
      );
    });
  });
});
