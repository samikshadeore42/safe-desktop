import { ethers } from 'ethers';

/**
 * Normalize v value: 0/1 -> 27/28
 */
export function normalizeV(v) {
  let vNum = typeof v === 'string' ? parseInt(v, 16) : v;
  if (vNum === 0 || vNum === 1) vNum += 27;
  return vNum;
}

/**
 * Recover signer address from safeTxHash and signature
 */
export function recoverSignerFromHash(safeTxHash, signature) {
  const sig = ethers.utils.splitSignature(signature);
  const recovered = ethers.utils.recoverAddress(safeTxHash, {
    r: sig.r,
    s: sig.s,
    v: normalizeV(sig.v)
  });
  return recovered;
}

/**
 * Pack signatures in Safe format: sorted by signer address, r+s+v per signature
 */
export function packSignatures(validSignatures) {
  // Sort by signer address ascending
  const sorted = validSignatures
    .map(sig => ({
      signer: ethers.utils.getAddress(sig.signer),
      signature: sig.signature
    }))
    .sort((a, b) => 
      a.signer.toLowerCase() < b.signer.toLowerCase() ? -1 : 1
    );

  // Pack as r(32) + s(32) + v(1) per signature
  let packed = '0x';
  for (const { signature } of sorted) {
    const sig = ethers.utils.splitSignature(signature);
    const v = normalizeV(sig.v);
    packed += sig.r.slice(2) + sig.s.slice(2) + v.toString(16).padStart(2, '0');
  }
  
  return packed;
}
