"use client";
import { useState } from "react";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function Home() {
  const [newDelegate, setNewDelegate] = useState("");
  const { data: delegate } = useScaffoldReadContract({ contractName: "YourContract", functionName: "delegate" });
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({ contractName: "YourContract" });
  const handleSetDelegate = async () => {
    if (!newDelegate) return;
    try {
      await writeYourContractAsync({ functionName: "setDelegate", args: [newDelegate] });
      setNewDelegate("");
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 max-w-xl mx-auto min-h-[70vh]">
      <h1 className="text-3xl font-bold">Delegate Funds dApp</h1>
      <div className="card bg-base-200 border border-base-300 p-6 rounded-xl shadow w-full text-center flex flex-col items-center">
        <span className="text-sm font-semibold opacity-70 mb-2">Current Active Delegate:</span>
        <div className="font-mono text-base break-all bg-base-300 px-4 py-2 rounded-lg">
          {delegate ? String(delegate) : "Loading..."}
        </div>
      </div>
      <div className="card bg-base-100 border border-base-300 p-6 rounded-xl shadow w-full flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Assign New Delegate</h2>
        <input
          type="text"
          value={newDelegate}
          onChange={e => setNewDelegate(e.target.value)}
          placeholder="0x..."
          className="input input-bordered w-full font-mono text-sm px-4 py-2"
        />
        <button className="btn btn-primary w-full" disabled={!newDelegate} onClick={handleSetDelegate}>
          Update Delegate
        </button>
      </div>
    </div>
  );
}
