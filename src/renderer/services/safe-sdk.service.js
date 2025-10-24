import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";

const SERVER_URL = "http://localhost:3000";

// This is for the second owner who signs locally
const LOCAL_SIGNER_PK = import.meta.env.VITE_OWNER2_PK;

const RPC_URL = import.meta.env.VITE_RPC_URL;
const SAFE_ADDRESS = import.meta.env.VITE_SAFE_ADDRESS;
const CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID || 11155111);
const EXECUTOR_PK = import.meta.env.VITE_WALLET_A_PK;

export async function getSafeInfo() {
  const response = await fetch(`${SERVER_URL}/safe/info`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get Safe info");
  }
  return await response.json();
}

export async function createSafeTx({ to, value = "0", data = "0x" }) {
  const response = await fetch(`${SERVER_URL}/safe/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, value, data }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create transaction");
  }
  return await response.json();
}

export async function signLocallyWithSDK(safeTxHash) {
  const localSignerPk = import.meta.env.VITE_OWNER2_PK;
  console.log('=== LOCAL SIGNING DEBUG ===');
  console.log('VITE_OWNER2_PK from env:', localSignerPk ? `${localSignerPk.substring(0, 20)}...` : 'NOT SET');
  
  if (!LOCAL_SIGNER_PK || LOCAL_SIGNER_PK.includes("YOUR_")) {
    throw new Error(
      "LOCAL_SIGNER_PK not configured. Set VITE_OWNER2_PK in .env"
    );
  }
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: LOCAL_SIGNER_PK,
    safeAddress: SAFE_ADDRESS,
    chainId: CHAIN_ID,
  });
  const signature = await protocolKit.signHash(safeTxHash);
  const sigStr = normalizeSignature(signature);
  return sigStr;
}

export async function getServerSignature(safeTxHash) {
  const response = await fetch(`${SERVER_URL}/safe/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ safeTxHash }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get server signature");
  }
  const result = await response.json();
  return result.signature;
}

// export async function executeTransaction(safeTransactionData, signatures) {
//   console.log('Signatures passed to executeTransaction:', signatures);
//   console.log('Safe transaction data:', safeTransactionData);
//   console.log('Making request to:', `${SERVER_URL}/safe/execute`);

//   try {
//     const response = await fetch(`${SERVER_URL}/safe/execute`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         safeTransactionData,
//         signatures
//       })
//     });

//     console.log('Response:', response);

//     console.log('Response status:', response.status);
//     console.log('Response ok:', response.ok);

//     if (!response.ok) {
//       const error = await response.json();
//       console.error('Server error:', error);
//       throw new Error(error.error || 'Failed to execute transaction');
//     }

//     const result = await response.json();
//     console.log('Server response:', result);
//     return result;
//   } catch (error) {
//     console.error('Network error:', error);
//     throw error;
//   }
// }

export async function exeTxn(safeTransactionData, signatures, safeTxHash) {
  const executorPk = EXECUTOR_PK;
  if (!executorPk)
    throw new Error("executorPk is required for direct client execution");

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: executorPk,
    safeAddress: SAFE_ADDRESS,
    chainId: CHAIN_ID,
  });

  console.log("protocolKit initialized for execution");

  // Map the safeTransactionData fields properly for createTransaction
  const safeTxPartial = {
    to: safeTransactionData.to,
    value: safeTransactionData.value,
    data: safeTransactionData.data,
    operation: safeTransactionData.operation,
    safeTxGas: safeTransactionData.safeTxGas,
    baseGas: safeTransactionData.baseGas,
    gasPrice: safeTransactionData.gasPrice,
    gasToken: safeTransactionData.gasToken,
    refundReceiver: safeTransactionData.refundReceiver,
    nonce: safeTransactionData.nonce,
  };

  console.log("Safe transaction partial:", safeTxPartial);

  // Create Safe transaction object
  const safeTransaction = await protocolKit.createTransaction({
    transactions: [safeTxPartial],
    onlyCalls: false,
  });

  console.log("Safe transaction created:", safeTransaction);

  // Add signatures (all should be 65-byte hex strings)
  for (const sig of signatures) {
    const sigStr = typeof sig === "string" ? sig : sig.signature;

    console.log("Processing signature:", sigStr);

    // Recover signer from the signature
    const recoveredAddress = ethers.utils.recoverAddress(safeTxHash, sigStr);
    console.log("Recovered signer address:", recoveredAddress);

    // Add signature in Safe SDK compatible format
    safeTransaction.addSignature({
      signer: recoveredAddress,
      data: sigStr,
    });
  }

  console.log("Signatures added to transaction");

  // After adding all signatures, BEFORE validation:

  console.log("=== VALIDATION DEBUG ===");

  // Get Safe info
  const safeOwners = await protocolKit.getOwners();
  const safeThreshold = await protocolKit.getThreshold();
  const safeNonce = await protocolKit.getNonce();

  console.log("Safe owners:", safeOwners);
  console.log("Safe threshold:", safeThreshold);
  console.log("Safe current nonce:", safeNonce.toString());
  console.log("Transaction nonce:", safeTransactionData.nonce);
  
  // Check Safe balance
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const safeBalance = await provider.getBalance(SAFE_ADDRESS);
  console.log(
    "Safe ETH balance:",
    ethers.utils.formatEther(safeBalance),
    "ETH"
  );
  const isValid = await protocolKit.isValidTransaction(safeTransaction);
  console.log("Transaction valid:", isValid);

  if (!isValid) {
    throw new Error("Transaction validation failed");
  }

  console.log("Transaction validated successfully");

  // Execute the Safe transaction on-chain
  const execResponse = await protocolKit.executeTransaction(safeTransaction);
  const txHash =
    execResponse?.transactionHash ||
    execResponse?.hash ||
    execResponse?.request?.hash;
  if (!txHash) throw new Error("No transaction hash returned");

  const receipt = await provider.waitForTransaction(txHash);

  return {
    txHash,
    receipt: {
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    },
  };
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

export function getLocalSignerAddress() {
  if (!LOCAL_SIGNER_PK || LOCAL_SIGNER_PK.includes("YOUR_")) {
    return "Not configured";
  }
  const wallet = new ethers.Wallet(LOCAL_SIGNER_PK);
  return wallet.address;
}
