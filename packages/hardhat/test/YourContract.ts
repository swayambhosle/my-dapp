import { expect } from "chai";
import { network } from "hardhat";
import type { Abi_YourContract } from "../generated/abis/YourContract.js";
import { loadAndExecuteDeploymentsFromFiles } from "../rocketh/environment.js";

const { provider, networkHelpers, ethers } = await network.create();

async function deployFixture() {
  const env = await loadAndExecuteDeploymentsFromFiles({ provider });
  const { address, abi } = env.get<Abi_YourContract>("YourContract");
  const yourContract = (await ethers.getContractAt(abi, address)) as any;
  return { env, yourContract };
}

describe("YourContract", function () {
  it("sets the deployer as owner and initial delegate", async function () {
    const { env, yourContract } = await networkHelpers.loadFixture(deployFixture);
    expect((await yourContract.owner()).toLowerCase()).to.equal(env.namedAccounts.deployer.toLowerCase());
    expect((await yourContract.delegate()).toLowerCase()).to.equal(env.namedAccounts.deployer.toLowerCase());
  });

  describe("delegation", function () {
    it("allows only the owner to set a nonzero delegate", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const [, nextDelegate, outsider] = await ethers.getSigners();

      await expect(yourContract.setDelegate(nextDelegate.address))
        .to.emit(yourContract, "DelegateChanged")
        .withArgs(await yourContract.owner(), nextDelegate.address);
      expect(await yourContract.delegate()).to.equal(nextDelegate.address);
      await expect(yourContract.connect(outsider).setDelegate(nextDelegate.address)).to.be.revertedWith(
        "Only the owner can perform this action",
      );
      await expect(yourContract.setDelegate(ethers.ZeroAddress)).to.be.revertedWith("Use revokeDelegation to revoke");
    });

    it("lets only the owner revoke and later restore delegation", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const [owner, nextDelegate, outsider] = await ethers.getSigners();

      await expect(yourContract.connect(outsider).revokeDelegation()).to.be.revertedWith(
        "Only the owner can perform this action",
      );
      await expect(yourContract.revokeDelegation())
        .to.emit(yourContract, "DelegateChanged")
        .withArgs(owner.address, ethers.ZeroAddress);
      expect(await yourContract.delegate()).to.equal(ethers.ZeroAddress);
      await yourContract.setDelegate(nextDelegate.address);
      expect(await yourContract.delegate()).to.equal(nextDelegate.address);
    });
  });

  describe("proposals and voting", function () {
    it("allows only the owner to create nonempty proposals", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const [, outsider] = await ethers.getSigners();

      await expect(yourContract.connect(outsider).createProposal("Title", "Description")).to.be.revertedWith(
        "Only the owner can perform this action",
      );
      await expect(yourContract.createProposal("", "Description")).to.be.revertedWith("Title cannot be empty");
      await expect(yourContract.createProposal("Title", "")).to.be.revertedWith("Description cannot be empty");
      await expect(yourContract.createProposal("Budget", "Fund the community grant"))
        .to.emit(yourContract, "ProposalCreated")
        .withArgs(1n, await yourContract.owner(), "Budget", "Fund the community grant");
      expect(await yourContract.proposalCount()).to.equal(1n);
      const proposal = await yourContract.getProposal(1n);
      expect(proposal.title).to.equal("Budget");
      expect(proposal.isOpen).to.equal(true);
    });

    it("allows the current delegate to vote once per address and updates totals", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const [, firstDelegate, nextDelegate, outsider] = await ethers.getSigners();
      await yourContract.createProposal("Budget", "Fund the community grant");

      await expect(yourContract.connect(outsider).vote(1n, true)).to.be.revertedWith(
        "Only the current delegate can vote",
      );
      await yourContract.setDelegate(firstDelegate.address);
      await expect(yourContract.connect(firstDelegate).vote(1n, true))
        .to.emit(yourContract, "VoteCast")
        .withArgs(1n, firstDelegate.address, true);
      await expect(yourContract.connect(firstDelegate).vote(1n, false)).to.be.revertedWith("Delegate already voted");

      // A replacement delegate can vote on existing proposals once as their own address.
      await yourContract.setDelegate(nextDelegate.address);
      await expect(yourContract.connect(firstDelegate).vote(1n, false)).to.be.revertedWith(
        "Only the current delegate can vote",
      );
      await yourContract.connect(nextDelegate).vote(1n, false);

      const proposal = await yourContract.getProposal(1n);
      expect(proposal.forVotes).to.equal(1n);
      expect(proposal.againstVotes).to.equal(1n);
      expect(await yourContract.hasVoted(1n, firstDelegate.address)).to.equal(true);
      expect(await yourContract.hasVoted(1n, nextDelegate.address)).to.equal(true);
    });

    it("allows only the owner to close a proposal and rejects later votes", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      const [owner, outsider] = await ethers.getSigners();
      await yourContract.createProposal("Budget", "Fund the community grant");

      await expect(yourContract.connect(outsider).closeProposal(1n)).to.be.revertedWith(
        "Only the owner can perform this action",
      );
      await expect(yourContract.closeProposal(2n)).to.be.revertedWith("Proposal does not exist");
      await expect(yourContract.closeProposal(1n)).to.emit(yourContract, "ProposalClosed").withArgs(1n, owner.address);
      await expect(yourContract.closeProposal(1n)).to.be.revertedWith("Proposal is already closed");
      await expect(yourContract.vote(1n, true)).to.be.revertedWith("Proposal is closed");
      expect((await yourContract.getProposal(1n)).isOpen).to.equal(false);
    });

    it("rejects voting while delegation is revoked", async function () {
      const { yourContract } = await networkHelpers.loadFixture(deployFixture);
      await yourContract.createProposal("Budget", "Fund the community grant");
      await yourContract.revokeDelegation();
      await expect(yourContract.vote(1n, true)).to.be.revertedWith("Only the current delegate can vote");
    });
  });
});
