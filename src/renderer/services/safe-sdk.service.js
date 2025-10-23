import { ethers } from 'ethers';
import Safe from '@safe-global/protocol-kit';

const SERVER_URL = 'http://localhost:3000';

// This is for the second owner who signs locally
const LOCAL_SIGNER_PK = import.meta.env.VITE_OWNER2_PK;

const RPC_URL = import.meta.env.VITE_RPC_URL;
const SAFE_ADDRESS = import.meta.env.VITE_SAFE_ADDRESS;
const CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID || 11155111);

export async function getSafeInfo() {
  const response = await fetch(`${SERVER_URL}/safe/info`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get Safe info');
  }
  return await response.json();
}

export async function createSafeTx({ to, value = '0', data = '0x' }) {
  const response = await fetch(`${SERVER_URL}/safe/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, value, data })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create transaction');
  }
  return await response.json();
}

export async function signLocallyWithSDK(safeTxHash) {
  if (!LOCAL_SIGNER_PK || LOCAL_SIGNER_PK.includes('YOUR_')) {
    throw new Error('LOCAL_SIGNER_PK not configured. Set VITE_OWNER2_PK in .env');
  }
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: LOCAL_SIGNER_PK,
    safeAddress: SAFE_ADDRESS,
    chainId: CHAIN_ID
  });
  const signature = await protocolKit.signHash(safeTxHash);
  const sigStr = normalizeSignature(signature);
  return sigStr;
}

export async function getServerSignature(safeTxHash) {
  const response = await fetch(`${SERVER_URL}/safe/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeTxHash })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get server signature');
  }
  const result = await response.json();
  return result.signature;
}

export async function executeTransaction(safeTransactionData, signatures) {
  const response = await fetch(`${SERVER_URL}/safe/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      safeTransactionData,
      signatures
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to execute transaction');
  }
  return await response.json();
}

function normalizeSignature(sig) {
  if (!sig) return null;
  if (typeof sig === 'string') return sig;
  if (sig.signature) return sig.signature;
  if (sig.data && typeof sig.data === 'string') return sig.data;
  if (sig.result) return sig.result;
  if (sig.signedMessage) return sig.signedMessage;
  return JSON.stringify(sig);
}

export function getLocalSignerAddress() {
  if (!LOCAL_SIGNER_PK || LOCAL_SIGNER_PK.includes('YOUR_')) {
    return 'Not configured';
  }
  const wallet = new ethers.Wallet(LOCAL_SIGNER_PK);
  return wallet.address;
}
