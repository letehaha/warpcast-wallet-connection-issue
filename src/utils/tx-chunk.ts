import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { COMPUTE_IX } from "./priority-fee";

const MAX = 1_232;
const MAX_CU = 195_000; // Solana's compute unit limit with a small buffer

export const chunkIx = async (
  connection: Connection,
  instructions: TransactionInstruction[],
  buyer: PublicKey,
  lookupTable: AddressLookupTableAccount | null,
  blockhash = "48tzUutUCPDohF4YqFpX9dHHS43V1bn9R45LHEFVhbtq",
  offset = 0,
) => {
  const result: TransactionInstruction[][] = [];
  let temp: TransactionInstruction[] = [];

  for (const ix of instructions) {
    const size = getSize([...temp, ix], buyer, lookupTable, blockhash);
    const simulatedCU = await simulateCU(
      connection,
      [...temp, ix],
      buyer,
      blockhash,
      lookupTable,
    );
    if (size > MAX - offset || simulatedCU > MAX_CU) {
      result.push(temp);
      temp = [ix];
    } else {
      temp.push(ix);
    }
  }

  if (temp.length > 0) {
    result.push(temp);
  }

  return result;
};

const getSize = (
  instructions: TransactionInstruction[],
  buyer: PublicKey,
  lookupTable: AddressLookupTableAccount | null,
  blockhash = "48tzUutUCPDohF4YqFpX9dHHS43V1bn9R45LHEFVhbtq",
) => {
  try {
    const msgV0 = new TransactionMessage({
      payerKey: buyer,
      recentBlockhash: blockhash,
      instructions: [COMPUTE_IX, ...instructions],
    }).compileToV0Message(lookupTable ? [lookupTable] : undefined);
    const tx = new VersionedTransaction(msgV0);
    return tx.serialize().length;
  } catch {
    return MAX + 1;
  }
};

const simulateCU = async (
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  blockhash: string,
  lookupTable: AddressLookupTableAccount | null,
): Promise<number> => {
  const msgV0 = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [COMPUTE_IX, ...instructions],
  }).compileToV0Message(lookupTable ? [lookupTable] : undefined);

  const tx = new VersionedTransaction(msgV0);
  const { value } = await connection.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });

  if (value.err) {
    return MAX_CU + 1; //Exceeding limit value;
  }

  return value.unitsConsumed ?? 0;
};
