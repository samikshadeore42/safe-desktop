import Safe from '@safe-global/protocol-kit';
import { recoverSignerFromHash, packSignatures, normalizeV } from '../lib/sig-utils.js';
import { ethers } from 'ethers';

const RPC = process.env.RPC_URL;
const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
const CHAIN_ID = Number(process.env.CHAIN_ID || 11155111);

/**
 * verifySignaturesAgainstOwners:
 * - signatures: [{ signer: '0x..', signature: '0x..' }, ...]
 * - safeTxHash: 0x...
 * returns { ok: true, packedSignatures } or { ok:false, error }
 */
export async function verifySignaturesAgainstOwners(safeTxHash, signatures) {
  if (!safeTxHash || !Array.isArray(signatures)) return { ok: false, error: 'invalid params' };

  // Initialize Protocol Kit just for owners & threshold
  const kit = await Safe.init({ provider: RPC, safeAddress: SAFE_ADDRESS, chainId: BigInt(CHAIN_ID) });
  const owners = (await kit.getOwners()).map(o => o.toLowerCase());
  const threshold = Number(await kit.getThreshold());

  // recover addresses
  const recovered = signatures.map(s => {
    // signature may come in various shapes; accept { signature } or string HEX
    const sigHex = (typeof s === 'string') ? s : (s.signature || s.data || s.signedMessage || s.result || s);
    const signer = recoverSignerFromHash(safeTxHash, sigHex);
    return { signer: ethers.utils.getAddress(signer), signature: sigHex };
  });

  // filter valid owners and unique
  const valid = [];
  const seen = new Set();
  for (const r of recovered) {
    const low = r.signer.toLowerCase();
    if (!owners.includes(low)) continue;
    if (seen.has(low)) continue;
    seen.add(low);
    valid.push(r);
  }

  if (valid.length < threshold) {
    return { ok: false, error: `Not enough valid owner signatures (have ${valid.length}, need ${threshold})` };
  }

  // pack signatures according to Safe order
  const packedSignatures = packSignatures(valid);
  return { ok: true, packedSignatures };
}
