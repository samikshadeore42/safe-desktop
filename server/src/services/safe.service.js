import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import { packSignatures } from '../lib/sig-utils.js';

const RPC = process.env.RPC_URL;
const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
const CHAIN_ID = Number(process.env.CHAIN_ID || 11155111);

if (!RPC || !SAFE_ADDRESS) {
  console.warn('Warning: RPC_URL or SAFE_ADDRESS not set. Set these in .env to operate properly.');
}

/**
 * createSafeTransaction:
 * - builds a minimal safeTransactionData POJO
 * - returns typedData (EIP-712), safeTxHash and safeTransactionData
 */
export async function createSafeTransaction({ to, value = '0', data = '0x' }) {
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  // Initialize Protocol Kit for reading safe nonce/owners etc
  const kit = await Safe.init({ provider: RPC, safeAddress: SAFE_ADDRESS, chainId: BigInt(CHAIN_ID) });

  // fetch nonce
  const nonce = Number(await kit.getNonce());

  // build the transaction object that the Safe expects
  const tx = {
    to,
    value: ethers.BigNumber.from(value).toString(),
    data: data || '0x',
    operation: 0
  };

  // create a safeTransaction using kit helper (keeps formats consistent)
  const safeTransaction = await kit.createTransaction({ transactions: [tx] });
  // get transaction hash (safeTxHash)
  const safeTxHash = await kit.getTransactionHash(safeTransaction);

  // Build typedData (EIP-712) to return to signer clients:
  // Use the standard SafeTx shape:
  const domain = {
    name: 'Gnosis Safe',
    version: '1.1.1',
    chainId: CHAIN_ID,
    verifyingContract: SAFE_ADDRESS
  };
  const types = {
    SafeTx: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
      { name: 'safeTxGas', type: 'uint256' },
      { name: 'baseGas', type: 'uint256' },
      { name: 'gasPrice', type: 'uint256' },
      { name: 'gasToken', type: 'address' },
      { name: 'refundReceiver', type: 'address' },
      { name: 'nonce', type: 'uint256' }
    ]
  };

  const stx = safeTransaction.data || {};
  const inner = (stx.transactions && stx.transactions[0]) || stx;

  const message = {
    to: inner.to,
    value: inner.value ?? '0',
    data: inner.data ?? '0x',
    operation: inner.operation ?? 0,
    safeTxGas: stx.safeTxGas ?? 0,
    baseGas: stx.baseGas ?? 0,
    gasPrice: stx.gasPrice ?? 0,
    gasToken: stx.gasToken ?? ethers.constants.AddressZero,
    refundReceiver: stx.refundReceiver ?? ethers.constants.AddressZero,
    nonce
  };

  // return minimal safeTransactionData (same shape used to build calldata later)
  return { safeTransactionData: message, typedData: { domain, types, primaryType: 'SafeTx', message }, safeTxHash };
}

/**
 * Build execTransaction calldata for Safe contract given safeTransactionData and packedSignatures.
 * Returns execTxRequest { to: SAFE_ADDRESS, data: calldata }.
 */
export function buildExecTxRequest(safeTransactionData, packedSignatures) {
  const safeAbi = [
    'function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures)'
  ];
  const iface = new ethers.utils.Interface(safeAbi);

  const calldata = iface.encodeFunctionData('execTransaction', [
    safeTransactionData.to,
    safeTransactionData.value,
    safeTransactionData.data,
    safeTransactionData.operation,
    safeTransactionData.safeTxGas,
    safeTransactionData.baseGas,
    safeTransactionData.gasPrice,
    safeTransactionData.gasToken,
    safeTransactionData.refundReceiver,
    packedSignatures
  ]);

  return { to: SAFE_ADDRESS, data: calldata };
}

/**
 * executeExecTransaction: server-side execution using EXECUTOR_PK
 * returns tx hash.
 */
export async function executeExecTransaction(execTxRequest, executorPk) {
  if (!executorPk) throw new Error('executorPk required');
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(executorPk, provider);

  // optional gas estimate
  let tx;
  try {
    const estimate = await provider.estimateGas({ to: execTxRequest.to, data: execTxRequest.data });
    const gasLimit = estimate.mul(120).div(100); // 20% buffer
    tx = await wallet.sendTransaction({ to: execTxRequest.to, data: execTxRequest.data, gasLimit });
  } catch (err) {
    // fallback without explicit gas
    tx = await wallet.sendTransaction({ to: execTxRequest.to, data: execTxRequest.data });
  }

  await tx.wait();
  return tx.hash;
}
