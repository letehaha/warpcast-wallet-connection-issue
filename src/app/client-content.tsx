"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import ConnectButton from "@/components/ConnectButton";
import { useCallback, useState } from "react";

import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { makeTx } from "@/utils//make-tx"; // your makeTx helper

export const ClientContent = () => {
  const { publicKey, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(0.001);

  const sendSol = useCallback(async () => {
    if (!publicKey || !signAllTransactions) return;

    try {
      const ix = SystemProgram.transfer({
        fromPubkey: publicKey!,
        toPubkey: new PublicKey(recipient),
        lamports: amount * LAMPORTS_PER_SOL,
      });

      const results = await makeTx({
        connection,
        feePayer: publicKey!,
        instructions: [ix],
        signAllTransactions: signAllTransactions,
      });

      alert("Success! Signature: " + results[0].signature);
    } catch (err) {
      alert((err as Error).message);
    }
  }, [connection, publicKey, signAllTransactions, recipient, amount]);

  return (
    <div>
      <ConnectButton />

      <form
        className="grid gap-4 max-w-[400px] w-screen m-auto mt-10"
        onSubmit={(e) => {
          e.preventDefault();
          sendSol();
        }}
      >
        <label className="grid gap-2">
          <span>Recipient</span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            type="text"
            placeholder="SOL address"
            className="text-black p-3"
          />
        </label>
        <label className="grid gap-2">
          <span>Amount (SOL)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.valueAsNumber)}
            type="number"
            placeholder="0"
            className="text-black p-3"
          />
        </label>

        <button className="mt-2 p-4 bg-slate-600 active:bg-slate-700">
          Submit
        </button>
      </form>
    </div>
  );
};
