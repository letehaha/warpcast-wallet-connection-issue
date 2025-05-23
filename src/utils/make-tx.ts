import {
  Connection,
  PublicKey,
  SignatureStatus,
  Signer,
  Transaction,
  TransactionConfirmationStatus,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { LOOKUP_TABLE } from "./lookup-table";
import { getCuUsage } from "./priority-fee";
import { sendRawTransaction } from "./sendRawTransaction";
import { chunkIx } from "./tx-chunk";

const CONFIRMATION_STATUSES: TransactionConfirmationStatus[] = [
  "processed",
  "confirmed",
  "finalized",
];

type TransactionType = Transaction | VersionedTransaction;

type makeTxParams = {
  connection: Connection;
  feePayer: PublicKey;
  signAllTransactions: (txs: TransactionType[]) => Promise<TransactionType[]>;
  signers?: Signer[];
  skipPreflight?: boolean;
  confirmCommitment?: TransactionConfirmationStatus;
} & (
  | { instructions: TransactionInstruction[]; transactions?: never }
  | { instructions?: never; transactions: TransactionType[] }
);

interface SendTransactionResult {
  signature: string | null;
  success: boolean;
}

export const makeTx = async ({
  connection,
  feePayer,
  instructions,
  signAllTransactions,
  transactions,
  skipPreflight = false,
  confirmCommitment = "processed",
}: makeTxParams) => {
  const results: SendTransactionResult[] = [];

  const latestBlockhash = await connection.getLatestBlockhash();

  const txs =
    transactions ??
    (await createTransactions({
      connection,
      feePayer,
      instructions,
      blockhash: latestBlockhash.blockhash,
    }));

  const signedTxs = await signAllTransactions(txs);

  for (let i = 0; i < signedTxs.length; i++) {
    const signedTx = signedTxs[i];
    let sig: string | null = null;

    try {
      console.info(`Sending ${i + 1}/${signedTxs.length}`);

      sig = await attemptTransactionSend({
        connection,
        signedTx,
        skipPreflight,
        confirmCommitment,
      });

      results.push({ signature: sig, success: true });
    } catch (err) {
      console.log(err);
    }
  }

  return results;
};

async function createTransactions({
  connection,
  feePayer,
  instructions,
  blockhash,
}: {
  connection: makeTxParams["connection"];
  feePayer: makeTxParams["feePayer"];
  instructions: NonNullable<makeTxParams["instructions"]>;
  blockhash: string;
}) {
  const lookUpTable = await connection.getAddressLookupTable(LOOKUP_TABLE);

  const chunks = await chunkIx(
    connection,
    instructions,
    feePayer,
    lookUpTable.value,
  );

  const transactions: VersionedTransaction[] = [];
  for (const chunk of chunks) {
    const cu = await getCuUsage(
      connection,
      chunk,
      feePayer,
      blockhash,
      lookUpTable.value,
    );
    const instructions = [...chunk];
    instructions.unshift(...cu);
    const msg = new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(lookUpTable.value ? [lookUpTable.value] : undefined);
    transactions.push(new VersionedTransaction(msg));
  }

  return transactions;
}

async function attemptTransactionSend({
  connection,
  signedTx,
  skipPreflight,
  confirmCommitment,
  // Number of retries
  retries = 3,
  // Delay between retries in milliseconds
  retryDelay = 2000,
  getSignatureStatusesRetries = 5,
  getSignatureStatusesRetryDelay = 1000,
}: {
  connection: Connection;
  signedTx: TransactionType;
  skipPreflight: boolean;
  confirmCommitment: TransactionConfirmationStatus;
  retries?: number;
  retryDelay?: number;
  getSignatureStatusesRetries?: number;
  getSignatureStatusesRetryDelay?: number;
}) {
  let attempt = 0;
  let lastError;

  while (attempt < retries) {
    try {
      const sig = await sendRawTransaction(
        connection,
        signedTx,
        skipPreflight,
        confirmCommitment,
      );

      let status: SignatureStatus | null = null;
      let statusAttempt = 0;

      while (statusAttempt < getSignatureStatusesRetries) {
        statusAttempt++;
        status = (await connection.getSignatureStatuses([sig])).value[0];
        if (!!status) {
          const { confirmationStatus, err } = status;

          if (!!confirmationStatus && err === null) {
            const statusIndex =
              CONFIRMATION_STATUSES.indexOf(confirmationStatus);
            const requiredIndex =
              CONFIRMATION_STATUSES.indexOf(confirmCommitment);
            if (requiredIndex >= 0 && statusIndex > requiredIndex) {
              return sig;
            }
          }
        }
        await new Promise((r) => setTimeout(r, getSignatureStatusesRetryDelay));
      }
    } catch (error) {
      lastError = error;
      attempt++;
      if (attempt < retries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Throw the last error after all retries failed
  throw lastError;
}
