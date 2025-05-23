/**
 * We keep things simple for now with a fixed priority fee
 *
 * The following URL https://docs.helius.dev/solana-rpc-nodes/alpha-priority-fee-api
 * contains a lot of useful information for dynamic pricing if we need to improve the computation logic
 *
 */
import {
  AddressLookupTableAccount,
  Blockhash,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import base58 from "bs58";

import { SOLANA_RPC } from "@/config";

export const COMPUTE_IX = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 3_000,
});

const MAX_TX_CU = 1_400_000;

// Used for tx size computation only
const DUMMY_COMPUTE_CU = ComputeBudgetProgram.setComputeUnitLimit({
  units: MAX_TX_CU,
});

/**
 * Helius Fee Estimate API: https://docs.helius.dev/solana-rpc-nodes/alpha-priority-fee-api
 */

type FeeEstimate = {
  jsonrpc: string;
  result: {
    priorityFeeEstimate: number;
  };
  id: "string";
  error?: any;
};

const getPriorityFeeEstimate = async (tx: VersionedTransaction) => {
  try {
    const response = await axios.post<FeeEstimate>(
      SOLANA_RPC,
      {
        jsonrpc: "2.0",
        id: "1",
        method: "getPriorityFeeEstimate",
        params: [
          {
            transaction: base58.encode(tx.serialize()),
            options: {
              recommended: true,
            },
          },
        ],
      },
      {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
      },
    );

    // Sometimes fails with status 200
    if (response.data.error) {
      return COMPUTE_IX;
    }

    return ComputeBudgetProgram.setComputeUnitPrice({
      microLamports:
        Math.ceil(response.data.result.priorityFeeEstimate + 10) || 3_000,
    });
  } catch (err) {
    console.error(err);
    return COMPUTE_IX;
  }
};

const isSquadX = () => {
  if (typeof window !== "undefined") {
    return localStorage?.getItem("walletName") === `"SquadsX"`;
  }
  return false;
};

/**
 * SquadX add custom instructions to the transaction without modifying the original CU instructions instead of adapting them, therefore it will fail because of insufficient CU if we don't add an offset.
 * This offset is based on Squads information as the avg
 */
const getCuOffset = () => {
  if (isSquadX()) {
    return 30_000;
  }
  return 0;
};

export const getCuUsage = async (
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  blockhash: Blockhash,
  lookupTable: AddressLookupTableAccount | null,
): Promise<TransactionInstruction[]> => {
  const msgV0 = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [DUMMY_COMPUTE_CU, COMPUTE_IX, ...instructions],
  }).compileToV0Message(lookupTable ? [lookupTable] : undefined);
  const tx = new VersionedTransaction(msgV0);
  const { value } = await connection.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });
  const cuPriceIx = await getPriorityFeeEstimate(tx);

  if (value.err === null && value.unitsConsumed) {
    return [
      ComputeBudgetProgram.setComputeUnitLimit({
        // For registrations the execution might differ between the simulation
        // and when the tx is processed because of Pyth price feed state so we request a bit more
        units: (value.unitsConsumed! + getCuOffset()) * 1.4,
      }),
      cuPriceIx,
    ];
  }

  return [cuPriceIx];
};
