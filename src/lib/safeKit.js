// src/lib/safeKit.js
import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";

const RPC_URL = import.meta.env.VITE_RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY";
const SAFE_ADDRESS = import.meta.env.VITE_SAFE_ADDRESS || "0xYourSafeAddress";
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);

if (!RPC_URL || !SAFE_ADDRESS) {
  throw new Error("RPC_URL and SAFE_ADDRESS must be set");
}

// Initialize Safe SDK with a wallet/signer (MetaMask, injected provider, etc.)
export async function initSafeKit(signer) {
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer,
    safeAddress: SAFE_ADDRESS,
    chainId: BigInt(CHAIN_ID),
  });
  return protocolKit;
}

// Create a transaction
export async function createSafeTransaction({ to, value = "0", data = "0x" }, signer) {
  const protocolKit = await initSafeKit(signer);

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [{ to, value: value.toString(), data }],
  });

  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

  const stxData = safeTransaction.data || {};
  const innerTx = (stxData.transactions && stxData.transactions[0]) || stxData;

  return {
    safeTransaction,
    safeTxHash,
    safeTransactionData: {
      to: innerTx.to,
      value: innerTx.value ?? "0",
      data: innerTx.data ?? "0x",
      operation: innerTx.operation ?? 0,
      safeTxGas: stxData.safeTxGas ?? "0",
      baseGas: stxData.baseGas ?? "0",
      gasPrice: stxData.gasPrice ?? "0",
      gasToken: stxData.gasToken ?? ethers.ZeroAddress,
      refundReceiver: stxData.refundReceiver ?? ethers.ZeroAddress,
      nonce: stxData.nonce ?? (await protocolKit.getNonce()),
    },
  };
}

// Sign a transaction hash with the connected wallet
export async function signTransactionHash(safeTxHash, signer) {
  const protocolKit = await initSafeKit(signer);
  const signature = await protocolKit.signHash(safeTxHash);
  return typeof signature === "string" ? signature : signature.data;
}

// Execute a transaction (once signatures are collected)
export async function executeTransaction(safeTransactionData, signatures, signer) {
  const protocolKit = await initSafeKit(signer);

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [safeTransactionData],
  });

  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

  for (const sig of signatures) {
    safeTransaction.addSignature({
      signer: ethers.recoverAddress(safeTxHash, sig),
      data: sig,
    });
  }

  const execResponse = await protocolKit.executeTransaction(safeTransaction);
  const txHash =
    execResponse?.transactionResponse?.hash ||
    execResponse?.transactionHash ||
    execResponse?.hash;

  const provider = new ethers.BrowserProvider(window.ethereum);
  const receipt = await provider.waitForTransaction(txHash);
  return { txHash, receipt };
}

// Get Safe info
export async function getSafeInfo(signer) {
  const protocolKit = await initSafeKit(signer);
  const [address, nonce, threshold, owners, isDeployed] = await Promise.all([
    protocolKit.getAddress(),
    protocolKit.getNonce(),
    protocolKit.getThreshold(),
    protocolKit.getOwners(),
    protocolKit.isSafeDeployed(),
  ]);
  return { address, nonce, threshold, owners, isDeployed };
}
