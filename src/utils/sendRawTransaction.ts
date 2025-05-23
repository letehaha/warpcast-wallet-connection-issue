import {
  Commitment,
  Connection,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

const send = async (
  connection: Connection,
  tx: Transaction | VersionedTransaction,
  skipPreflight: boolean,
  preflightCommitment: Commitment,
): Promise<string> => {
  if (!tx) {
    throw new Error(
      `Unexpected error. Cannot evaluate the transaction. Please try again`,
    );
  }

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight,
    preflightCommitment,
  });
  return sig;
};

export const sendRawTransaction = async (
  connection: Connection,
  tx: Transaction | VersionedTransaction,
  skipPreflight = false,
  preflightCommitment: Commitment = "processed",
): Promise<string> => {
  return send(connection, tx, skipPreflight, preflightCommitment);
};
