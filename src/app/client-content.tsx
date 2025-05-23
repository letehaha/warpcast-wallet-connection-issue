"use client";

import {
  useConnection,
  useWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import ConnectButton from "@/components/ConnectButton";
import { useCallback, useState } from "react";

import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  Connection,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { makeTx } from "@/utils//make-tx";

async function sendSolWithGenericApproach({
  connection,
  signTransaction,
  publicKey,
  instructions,
}: {
  publicKey: PublicKey;
  signTransaction: WalletContextState["signTransaction"];
  connection: Connection;
  instructions: TransactionInstruction[];
}) {
  alert("Using generic approach");
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(messageV0);

  const signedTx = await signTransaction!(versionedTx);

  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  alert("✅ Versioned transaction sent: " + signature);
  return signature;
}

export const ClientContent = () => {
  const { publicKey, signAllTransactions, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(0.001);
  const [checked, setChecked] = useState(false);

  const sendSol = useCallback(async () => {
    if (!publicKey || !signAllTransactions || !signTransaction) return;

    try {
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey!,
        toPubkey: new PublicKey(recipient),
        lamports: amount * LAMPORTS_PER_SOL,
      });

      if (checked) {
        await sendSolWithGenericApproach({
          connection,
          publicKey,
          signTransaction,
          instructions: [transferInstruction],
        });
      } else {
        alert("Using custom utilites");

        const results = await makeTx({
          connection,
          feePayer: publicKey!,
          instructions: [transferInstruction],
          signAllTransactions: signAllTransactions,
        });

        alert("Success! Signature: " + results[0].signature);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  }, [
    connection,
    publicKey,
    signAllTransactions,
    signTransaction,
    recipient,
    amount,
    checked,
  ]);

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

        <label className="flex gap-2">
          <input
            checked={checked}
            onChange={(e) => setChecked(!checked)}
            type="checkbox"
          />
          <span>Use generic approach (no custom utilites)</span>
        </label>

        <button className="mt-2 p-4 bg-slate-600 active:bg-slate-700">
          Submit
        </button>
      </form>
    </div>
  );
};
