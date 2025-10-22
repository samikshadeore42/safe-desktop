import { ethers } from "ethers";
import { packSignatures } from "./sig-utils";

// ----- CONFIG: change for your environment -----
// Using Vite environment variables (VITE_ prefix required for client-side access)
const RPC =
  import.meta.env.VITE_RPC_URL;
const SAFE_ADDRESS =
  import.meta.env.VITE_SAFE_ADDRESS;
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
// ----------------------------------------------

const provider = new ethers.providers.JsonRpcProvider(RPC);
const SERVER_URL = process.env.SAFE_SERVER_URL || 'http://localhost:3000';

// PoC only: embedded wallets for signing (in prod keys must be stored securely)
const WALLET_A_PK =
  import.meta.env.VITE_WALLET_A_PK ||
  "";
const WALLET_B_PK =
  import.meta.env.VITE_WALLET_B_PK ||
  "";
const walletA = new ethers.Wallet(WALLET_A_PK, provider);
const walletB = new ethers.Wallet(WALLET_B_PK, provider);

export async function createSafeTxOnServer({ to, value, data }) {
  const body = {
    to,
    // the server expects value in wei (string) if you used that earlier.
    value: ethers.utils.parseEther(value || '0').toString(),
    data: data || '0x'
  };
  const resp = await fetch(`${SERVER_URL}/safe/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`create failed: ${err}`);
  }
  const json = await resp.json();
  // returns { safeTxHash, typedData, safeTransactionData }
  return json;
}

export async function signWithMetaMask(typedData) {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  // MetaMask EIP-712 v4 signing
  const signature = await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [account, JSON.stringify(typedData)]
  });
  return { signer: account, signature };
}

export async function signWithLocalWallet(typedData, localWallet) {
  // localWallet is ethers.Wallet instance stored in the app (or retrieved from keytar)
  // Use ethers.js typed-data helper
  // ethers Wallet has _signTypedData(domain, types, message)
  const sig = await localWallet._signTypedData(typedData.domain, typedData.types, typedData.message);
  const signer = await localWallet.getAddress();
  return { signer, signature: sig };
}

// 3) Submit both signatures to server
export async function submitSafeTxToServer({ safeTxHash, typedData, safeTransactionData, sigs, executeWith = 'metamask' }) {
  // sigs: [{ signer, signature }, ...] array collected from signWithMetaMask and signWithLocalWallet
  const resp = await fetch(`${SERVER_URL}/safe/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeTxHash, safeTransactionData, signatures: sigs, executeWith })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`submit failed: ${text}`);
  }
  return resp.json(); // { status: 'ready', execTxRequest } or { status: 'executed', txHash }
}

export async function submitSafeTxToServer({
  to,
  value,
  data,
  executeWith = "metamask",
}) {
  // This PoC signs both signatures locally
  const { safeTxHash, typedData, safeTransactionData } =
    await createSafeTxOnServer({ to, value, data });

  // sign using walletA and walletB (embedded private keys for PoC)
  const sigA = await walletA._signTypedData(
    typedData.domain,
    typedData.types,
    typedData.message
  );
  const sigB = await walletB._signTypedData(
    typedData.domain,
    typedData.types,
    typedData.message
  );

  // Normalize signatures & pack
  const sigs = [
    { signer: await walletA.getAddress(), signature: sigA },
    { signer: await walletB.getAddress(), signature: sigB },
  ];
  const packed = packSignatures(sigs);

  // Build execTransaction calldata
  const safeAbi = [
    "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures)",
  ];
  const iface = new ethers.utils.Interface(safeAbi);
  const calldata = iface.encodeFunctionData("execTransaction", [
    safeTransactionData.to,
    safeTransactionData.value,
    safeTransactionData.data,
    safeTransactionData.operation,
    safeTransactionData.safeTxGas,
    safeTransactionData.baseGas,
    safeTransactionData.gasPrice,
    safeTransactionData.gasToken,
    safeTransactionData.refundReceiver,
    packed,
  ]);

  const execTxRequest = { to: SAFE_ADDRESS, data: calldata };

  if (executeWith === "metamask") {
    return { status: "ready", execTxRequest };
  } else {
    // Server-style execution would sign & send here (not implemented in PoC)
    return { status: "not-implemented" };
  }
}
