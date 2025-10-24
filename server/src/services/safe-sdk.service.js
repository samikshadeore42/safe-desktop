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
  console.log("SafeTxHash to sign:", safeTxHash);
  
  // Verify the signer address before signing
  const signerWallet = new ethers.Wallet(signerPk);
  console.log("SERVER signer address:", signerWallet.address);
  
  // Create raw hash signature for Safe contract compatibility
  console.log('Creating raw hash signature for Safe contract compatibility...');
  
  try {
    // Sign the raw hash bytes directly (no Ethereum message prefix)
    const rawHashBytes = ethers.utils.arrayify(safeTxHash);
    const rawSignature = await signerWallet._signingKey().signDigest(rawHashBytes);
    const rawSigStr = ethers.utils.joinSignature(rawSignature);
    
    console.log('Raw hash signature generated:', rawSigStr);
    
    // Verify it recovers correctly with raw hash
    const rawRecovered = ethers.utils.recoverAddress(safeTxHash, rawSigStr);
    console.log('Raw signature recovers to:', rawRecovered);
    console.log('Raw signature recovery matches:', rawRecovered.toLowerCase() === signerWallet.address.toLowerCase());
    
    if (rawRecovered.toLowerCase() === signerWallet.address.toLowerCase()) {
      console.log('✅ Using raw hash signature (Safe contract compatible)');
      return rawSigStr;
    }
  } catch (e) {
    console.log('Raw hash signing failed:', e.message);
  }
  
  // Fallback to Safe SDK
  console.log('Trying Safe SDK as fallback...');
  const protocolKit = await initSafeKit(signerPk);
  const signature = await protocolKit.signHash(safeTxHash);
  const sigStr = normalizeSignature(signature);
  
  // Verify the Safe SDK signature
  const directRecovered = ethers.utils.recoverAddress(safeTxHash, sigStr);
  console.log('Safe SDK signature recovers to:', directRecovered);
  
  if (directRecovered.toLowerCase() === signerWallet.address.toLowerCase()) {
    console.log('✅ Using Safe SDK signature');
    return sigStr;
  }
  
  // Last resort: message signing
  console.log('Trying message signing as last resort...');
  const directSignature = await signerWallet.signMessage(ethers.utils.arrayify(safeTxHash));
  console.log('Message signature:', directSignature);
  
  const fallbackRecovered = ethers.utils.recoverAddress(safeTxHash, directSignature);
  console.log("Message signature recovers to:", fallbackRecovered);
  
  console.log('❌ All signing methods failed to create raw hash compatible signatures');
  return sigStr; // Return Safe SDK signature as best effort
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
