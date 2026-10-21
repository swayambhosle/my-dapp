"use client";

import { SyntheticEvent, useMemo, useState } from "react";
import { Address as AddressDisplay } from "@scaffold-ui/components";
import { Address, isAddress, zeroAddress } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink, getParsedError } from "~~/utils/scaffold-eth";

const ProposalCard = ({
  proposalId,
  canVote,
  canManage,
}: {
  proposalId: bigint;
  canVote: boolean;
  canManage: boolean;
}) => {
  const { address } = useAccount();
  const [pendingVote, setPendingVote] = useState(false);
  const {
    data: proposal,
    isLoading,
    error,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getProposal",
    args: [proposalId],
  });
  const { data: voted } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "hasVoted",
    args: [proposalId, address ?? zeroAddress],
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "YourContract" });

  const handleVote = async (support: boolean) => {
    setPendingVote(true);
    try {
      await writeContractAsync({ functionName: "vote", args: [proposalId, support] });
    } catch {
      // Scaffold-ETH's transactor displays the wallet or contract error.
    } finally {
      setPendingVote(false);
    }
  };

  const handleClose = async () => {
    setPendingVote(true);
    try {
      await writeContractAsync({ functionName: "closeProposal", args: [proposalId] });
    } catch {
      // Scaffold-ETH's transactor displays the wallet or contract error.
    } finally {
      setPendingVote(false);
    }
  };

  if (isLoading) return <div className="card bg-base-100 p-5 shadow">Loading proposal {proposalId.toString()}…</div>;
  if (error || !proposal) {
    return <div className="alert alert-error">Could not load proposal {proposalId.toString()}.</div>;
  }

  const [title, description, createdAt, forVotes, againstVotes, isOpen] = proposal;
  const date = new Date(Number(createdAt) * 1000).toLocaleDateString();
  const voteDisabled = !canVote || !isOpen || Boolean(voted) || isMining || pendingVote;

  return (
    <article className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs opacity-60">
              Proposal #{proposalId.toString()} · {date}
            </p>
            <h3 className="card-title mt-1">{title}</h3>
          </div>
          <span className={`badge ${isOpen ? "badge-success" : "badge-neutral"}`}>{isOpen ? "Open" : "Closed"}</span>
        </div>
        <p className="whitespace-pre-wrap break-words">{description}</p>
        <div className="flex flex-wrap gap-4 text-sm" aria-label="Vote totals">
          <span>
            For: <strong>{forVotes.toString()}</strong>
          </span>
          <span>
            Against: <strong>{againstVotes.toString()}</strong>
          </span>
        </div>
        <div className="card-actions justify-end">
          {canManage && isOpen && (
            <button
              className="btn btn-outline btn-sm"
              type="button"
              disabled={isMining || pendingVote}
              onClick={handleClose}
            >
              Close proposal
            </button>
          )}
          {canVote && isOpen && !voted && (
            <>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                disabled={voteDisabled}
                onClick={() => handleVote(false)}
              >
                Vote against
              </button>
              <button
                className="btn btn-primary btn-sm"
                type="button"
                disabled={voteDisabled}
                onClick={() => handleVote(true)}
              >
                Vote for
              </button>
            </>
          )}
          {Boolean(voted) && <span className="badge badge-info">Your wallet has voted</span>}
          {!isOpen && <span className="text-sm opacity-60">Voting is closed</span>}
        </div>
      </div>
    </article>
  );
};

export default function Home() {
  const { address, chain, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: contract } = useDeployedContractInfo({ contractName: "YourContract" });
  const [newDelegate, setNewDelegate] = useState("");
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastTransaction, setLastTransaction] = useState<`0x${string}`>();

  const ownerRead = useScaffoldReadContract({ contractName: "YourContract", functionName: "owner" });
  const delegateRead = useScaffoldReadContract({ contractName: "YourContract", functionName: "delegate" });
  const contractVersionRead = useScaffoldReadContract({ contractName: "YourContract", functionName: "version" });
  const contractReady = contractVersionRead.data === 2n;
  const countRead = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "proposalCount",
    query: { enabled: contractReady },
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "YourContract" });
  const delegateHistory = useScaffoldEventHistory({
    contractName: "YourContract",
    eventName: "DelegateChanged",
    watch: true,
    enabled: contractReady,
  });
  const proposalHistory = useScaffoldEventHistory({
    contractName: "YourContract",
    eventName: "ProposalCreated",
    watch: true,
    enabled: contractReady,
  });
  const voteHistory = useScaffoldEventHistory({
    contractName: "YourContract",
    eventName: "VoteCast",
    watch: true,
    enabled: contractReady,
  });
  const closeHistory = useScaffoldEventHistory({
    contractName: "YourContract",
    eventName: "ProposalClosed",
    watch: true,
    enabled: contractReady,
  });

  const owner = ownerRead.data as Address | undefined;
  const delegate = delegateRead.data as Address | undefined;
  const isOwner = Boolean(address && owner && address.toLowerCase() === owner.toLowerCase());
  const isDelegate = Boolean(
    address && delegate && delegate !== zeroAddress && address.toLowerCase() === delegate.toLowerCase(),
  );
  const isCorrectNetwork = chain?.id === targetNetwork.id;
  const role =
    isOwner && isDelegate ? "Owner and delegate" : isOwner ? "Owner" : isDelegate ? "Delegate" : "Unassigned";
  const proposalIds = useMemo(() => {
    const count = countRead.data ?? 0n;
    const visibleCount = Number(count > 50n ? 50n : count);
    return Array.from({ length: visibleCount }, (_, index) => BigInt(index + 1));
  }, [countRead.data]);

  const runWrite = async (action: () => Promise<`0x${string}` | undefined>, successText: string): Promise<boolean> => {
    setFormError("");
    setNotice("");
    try {
      const hash = await action();
      if (hash) {
        setLastTransaction(hash);
        setNotice(successText);
        return true;
      }
      return false;
    } catch (error) {
      const message = getParsedError(error);
      setFormError(message);
      return false;
    }
  };

  const handleAssignDelegate = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contractReady) return setFormError("The Sepolia contract upgrade is required before managing delegation.");
    if (!isAddress(newDelegate)) return setFormError("Enter a valid Ethereum address.");
    if (newDelegate.toLowerCase() === zeroAddress) return setFormError("Use Revoke delegation to remove the delegate.");
    const updated = await runWrite(
      () => writeContractAsync({ functionName: "setDelegate", args: [newDelegate] }),
      "Delegate updated successfully.",
    );
    if (updated) setNewDelegate("");
  };

  const handleRevoke = async () => {
    if (!contractReady) return setFormError("The Sepolia contract upgrade is required before managing delegation.");
    await runWrite(() => writeContractAsync({ functionName: "revokeDelegation" }), "Delegation revoked.");
  };

  const handleCreateProposal = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contractReady) return setFormError("The Sepolia contract upgrade is required before creating proposals.");
    if (!proposalTitle.trim() || !proposalDescription.trim())
      return setFormError("Enter both a proposal title and description.");
    const created = await runWrite(
      () =>
        writeContractAsync({
          functionName: "createProposal",
          args: [proposalTitle.trim(), proposalDescription.trim()],
        }),
      "Proposal created successfully.",
    );
    if (created) {
      setProposalTitle("");
      setProposalDescription("");
    }
  };

  const histories = [
    ...(delegateHistory.data ?? []).flatMap(event =>
      event.transactionHash
        ? [{ label: "Delegation changed", hash: event.transactionHash, block: event.blockNumber ?? 0n }]
        : [],
    ),
    ...(proposalHistory.data ?? []).flatMap(event =>
      event.transactionHash
        ? [{ label: "Proposal created", hash: event.transactionHash, block: event.blockNumber ?? 0n }]
        : [],
    ),
    ...(voteHistory.data ?? []).flatMap(event =>
      event.transactionHash
        ? [{ label: "Vote cast", hash: event.transactionHash, block: event.blockNumber ?? 0n }]
        : [],
    ),
    ...(closeHistory.data ?? []).flatMap(event =>
      event.transactionHash
        ? [{ label: "Proposal closed", hash: event.transactionHash, block: event.blockNumber ?? 0n }]
        : [],
    ),
  ]
    .sort((a, b) => Number(b.block ?? 0n) - Number(a.block ?? 0n))
    .slice(0, 12);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Sepolia delegation & voting</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Delegate dashboard</h1>
        <p className="max-w-3xl opacity-75">
          The owner assigns one delegate. The current delegate may vote once on each open proposal.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Account and contract status">
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-5">
            <h2 className="text-sm opacity-60">Connected wallet</h2>
            {isConnected && address ? (
              <AddressDisplay address={address} format="long" onlyEnsOrAddress chain={targetNetwork} />
            ) : (
              <p>Connect a wallet to continue.</p>
            )}
            {isConnected && (
              <p className="text-sm">
                Role: <strong>{role}</strong>
              </p>
            )}
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-5">
            <h2 className="text-sm opacity-60">Network</h2>
            <p className={isCorrectNetwork ? "font-semibold text-success" : "font-semibold text-warning"}>
              {chain?.name ?? "Wallet not connected"}
            </p>
            <p className="text-sm">
              {isCorrectNetwork
                ? `Connected to ${targetNetwork.name}`
                : `Switch to ${targetNetwork.name} using the wallet menu.`}
            </p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-5">
            <h2 className="text-sm opacity-60">Contract</h2>
            {contract ? (
              <AddressDisplay address={contract.address} format="long" chain={targetNetwork} />
            ) : (
              <p>{"Contract unavailable on this network."}</p>
            )}
            {contract && (
              <a
                className="link link-primary text-sm"
                href={`${targetNetwork.blockExplorers?.default.url}/address/${contract.address}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Sepolia Etherscan
              </a>
            )}
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-5">
            <h2 className="text-sm opacity-60">Owner</h2>
            {ownerRead.isLoading ? (
              <p>Loading owner…</p>
            ) : owner ? (
              <AddressDisplay address={owner} format="long" onlyEnsOrAddress chain={targetNetwork} />
            ) : (
              <p className="text-error">
                Owner unavailable{ownerRead.error ? `: ${getParsedError(ownerRead.error)}` : "."}
              </p>
            )}
            <p className="mt-1 text-sm opacity-60">Only the owner can manage delegation and proposals.</p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300 shadow-sm sm:col-span-2">
          <div className="card-body p-5">
            <h2 className="text-sm opacity-60">Current delegate</h2>
            {delegateRead.isLoading ? (
              <p>Loading delegate…</p>
            ) : delegate === zeroAddress ? (
              <p className="text-warning">No delegate assigned.</p>
            ) : delegate ? (
              <AddressDisplay address={delegate} format="long" onlyEnsOrAddress chain={targetNetwork} />
            ) : (
              <p className="text-error">
                Delegate unavailable{delegateRead.error ? `: ${getParsedError(delegateRead.error)}` : "."}
              </p>
            )}
          </div>
        </div>
      </section>

      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {lastTransaction && (
        <p className="text-sm">
          Last transaction:{" "}
          <a
            className="link link-primary break-all"
            href={getBlockExplorerTxLink(targetNetwork.id, lastTransaction)}
            target="_blank"
            rel="noreferrer"
          >
            {lastTransaction}
          </a>
        </p>
      )}
      {isConnected && !isCorrectNetwork && (
        <div className="alert alert-warning" role="status">
          Switch your connected wallet to Sepolia before submitting transactions.
        </div>
      )}
      {!contractVersionRead.isLoading && !contractReady && (
        <div className="alert alert-warning" role="status">
          The current Sepolia deployment does not yet verify as the updated contract. Delegation management, proposals,
          voting, and activity stay disabled until you deploy the updated contract.{" "}
          {contractVersionRead.error
            ? "The version check failed; the deployed address may still point to the older contract."
            : ""}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Delegation management">
        <form className="card bg-base-100 border border-base-300 shadow-sm" onSubmit={handleAssignDelegate}>
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Assign or replace delegate</h2>
              <p className="text-sm opacity-70">
                Owner wallet required. The new delegate may vote once on each open proposal.
              </p>
            </div>
            <label className="form-control w-full">
              <span className="label-text mb-2">New delegate address</span>
              <input
                className="input input-bordered w-full font-mono"
                aria-label="New delegate address"
                placeholder="0x…"
                value={newDelegate}
                onChange={event => setNewDelegate(event.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="card-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!contractReady || !isOwner || !isCorrectNetwork || isMining}
              >
                {isMining ? "Waiting for wallet…" : "Set delegate"}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={handleRevoke}
                disabled={
                  !contractReady || !isOwner || !delegate || delegate === zeroAddress || !isCorrectNetwork || isMining
                }
              >
                Revoke delegation
              </button>
            </div>
          </div>
        </form>

        <form className="card bg-base-100 border border-base-300 shadow-sm" onSubmit={handleCreateProposal}>
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Create a proposal</h2>
              <p className="text-sm opacity-70">Owner-created proposals stay open until the owner closes them.</p>
            </div>
            <label className="form-control w-full">
              <span className="label-text mb-2">Proposal title</span>
              <input
                className="input input-bordered w-full"
                aria-label="Proposal title"
                maxLength={120}
                value={proposalTitle}
                onChange={event => setProposalTitle(event.target.value)}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">Description</span>
              <textarea
                className="textarea textarea-bordered min-h-24 w-full"
                aria-label="Proposal description"
                maxLength={2000}
                value={proposalDescription}
                onChange={event => setProposalDescription(event.target.value)}
              />
            </label>
            <button
              className="btn btn-primary self-start"
              type="submit"
              disabled={!contractReady || !isOwner || !isCorrectNetwork || isMining}
            >
              {isMining ? "Waiting for wallet…" : "Create proposal"}
            </button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="proposals-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="proposals-heading" className="text-2xl font-bold">
              Proposals
            </h2>
            <p className="text-sm opacity-70">
              The current delegate can vote once per proposal. A replacement delegate may vote on open proposals.
            </p>
          </div>
          <span className="badge badge-outline">{(countRead.data ?? 0n).toString()} total</span>
        </div>
        {!contractReady ? (
          <div className="rounded-box border border-dashed border-base-300 p-8 text-center opacity-70">
            Proposals will appear here after the updated Sepolia contract is deployed.
          </div>
        ) : countRead.isLoading ? (
          <p>Loading proposals…</p>
        ) : proposalIds.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-300 p-8 text-center opacity-70">
            No proposals yet. The owner can create the first one above.
          </div>
        ) : (
          <div className="grid gap-4">
            {proposalIds.map(proposalId => (
              <ProposalCard
                key={proposalId.toString()}
                proposalId={proposalId}
                canVote={isDelegate && isCorrectNetwork}
                canManage={isOwner && isCorrectNetwork}
              />
            ))}
          </div>
        )}
        {proposalIds.length === 50 && <p className="text-xs opacity-60">Showing the first 50 proposals.</p>}
      </section>

      <section className="card bg-base-100 border border-base-300 shadow-sm" aria-labelledby="history-heading">
        <div className="card-body">
          <div>
            <h2 id="history-heading" className="card-title">
              On-chain activity
            </h2>
            <p className="text-sm opacity-70">Recent delegation and proposal transactions from contract events.</p>
          </div>
          {!contractReady ? (
            <p className="rounded-box bg-base-200 p-4 text-sm">
              Activity will appear after the updated Sepolia contract is deployed.
            </p>
          ) : delegateHistory.isLoading ||
            proposalHistory.isLoading ||
            voteHistory.isLoading ||
            closeHistory.isLoading ? (
            <p>Loading activity…</p>
          ) : histories.length === 0 ? (
            <p className="rounded-box bg-base-200 p-4 text-sm">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-base-300">
              {histories.map((item, index) => (
                <li key={`${item.hash}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>{item.label}</span>
                  <a
                    className="link link-primary break-all font-mono text-sm"
                    href={getBlockExplorerTxLink(targetNetwork.id, item.hash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.hash}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <p className="text-center text-xs opacity-60">
        Proposal changes and votes are recorded on Sepolia. Confirm each transaction in your wallet; never share your
        recovery phrase or private key.
      </p>
    </main>
  );
}
