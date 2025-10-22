import { ethers } from 'ethers';

// normalize v to 27/28
export function normalizeV(signature) {
  if (!signature) return signature;
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;
  const vHex = sig.slice(128, 130);
  let v = parseInt(vHex, 16);
  if (v === 0 || v === 1) v += 27;
  const newVHex = v.toString(16).padStart(2, '0');
  return '0x' + sig.slice(0, 128) + newVHex;
}

export function recoverSignerFromHash(hash, signature) {
  const sig = (typeof signature === 'object' && signature.signature) ? signature.signature : signature;
  const normalized = normalizeV(sig);
  return ethers.utils.recoverAddress(hash, normalized);
}

/**
 * packSignatures(signatures)
 * signatures: [{ signer: '0x..', signature: '0x..' }, ...]
 * returns: '0x' + r1+s1+v1 + r2+s2+v2 ... sorted by signer address ascending
 */
export function packSignatures(signatures) {
  const sorted = signatures.slice().sort((a, b) => a.signer.toLowerCase().localeCompare(b.signer.toLowerCase()));
  const parts = sorted.map(s => {
    const sig = s.signature || s;
    const n = normalizeV(sig).slice(2);
    // ensure length 130 hex chars (r(64)+s(64)+v(2))
    if (n.length !== 130) {
      // try to handle 65 bytes variants that may include 1 byte v as 01
      // but most wallets give 65 bytes -> 130 hex + 2 prefix, so normalized -> 130
      // if not correct length, throw
      throw new Error('Invalid signature length when packing signatures');
    }
    return n;
  });
  return '0x' + parts.join('');
}
