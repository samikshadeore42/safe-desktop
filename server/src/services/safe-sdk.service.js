import "dotenv/config";
import Safe from "@safe-global/protocol-kit";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL;
const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
const CHAIN_ID = BigInt(process.env.CHAIN_ID || 11155111);

if (!RPC_URL || !SAFE_ADDRESS) {
  throw new Error("RPC_URL and SAFE_ADDRESS must be set in .env");
}

/**
 * Initialize Safe Protocol Kit with a signer
 * @param {string} signerPk - Private key of the signer
 * @returns {Promise<Safe>} - Initialized Safe Protocol Kit instance
 */
export async function initSafeKit(signerPk) {
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: signerPk,
    safeAddress: SAFE_ADDRESS,
    chainId: CHAIN_ID,
  });
  return protocolKit;
}

export async function createSafeTransaction(
  { to, value = "0", data = "0x" },
  signerPk
) {
  const protocolKit = await initSafeKit(signerPk);

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      {
        to,
        value: value.toString(),
        data,
      },
    ],
  });

  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const stxData = safeTransaction.data || {};
  const innerTx = (stxData.transactions && stxData.transactions[0]) || stxData;

  const safeTransactionData = {
    to: innerTx.to,
    value: innerTx.value ?? "0",
    data: innerTx.data ?? "0x",
    operation: innerTx.operation ?? 0,
    safeTxGas: stxData.safeTxGas ?? "0",
    baseGas: stxData.baseGas ?? "0",
    gasPrice: stxData.gasPrice ?? "0",
    gasToken: stxData.gasToken ?? ethers.constants.AddressZero,
    refundReceiver: stxData.refundReceiver ?? ethers.constants.AddressZero,
    nonce: stxData.nonce ?? (await protocolKit.getNonce()),
  };

  return {
    safeTransaction,
    safeTxHash,
    safeTransactionData,
  };
}

export async function signTransactionHash(safeTxHash, signerPk) {
  console.log("=== SERVER SIGNING DEBUG ===");
  console.log(
    "signerPk provided:",
    signerPk ? `${signerPk.substring(0, 20)}...` : "NOT PROVIDED"
  );
  const protocolKit = await initSafeKit(signerPk);
  const signature = await protocolKit.signHash(safeTxHash);
  const sigStr = normalizeSignature(signature);

  return sigStr;
}

function normalizeSignature(sig) {
  if (!sig) return null;
  if (typeof sig === "string") return sig;
  if (sig.signature) return sig.signature;
  if (sig.data && typeof sig.data === "string") return sig.data;
  if (sig.result) return sig.result;
  if (sig.signedMessage) return sig.signedMessage;
  return JSON.stringify(sig);
}

export async function getSafeInfo(signerPk) {
  const protocolKit = await initSafeKit(signerPk);

  const [address, nonce, threshold, owners, isDeployed] = await Promise.all([
    protocolKit.getAddress(),
    protocolKit.getNonce(),
    protocolKit.getThreshold(),
    protocolKit.getOwners(),
    protocolKit.isSafeDeployed(),
  ]);

  return {
    address,
    nonce,
    threshold,
    owners,
    isDeployed,
  };
}
