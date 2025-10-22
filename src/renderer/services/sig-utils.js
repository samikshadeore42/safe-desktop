import { ethers } from 'ethers'

export function normalizeV(signature) {
  if (!signature) return signature
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature
  const v = parseInt(sig.slice(128, 130), 16)
  let vNorm = v
  if (v === 0 || v === 1) vNorm = v + 27
  const newVHex = vNorm.toString(16).padStart(2, '0')
  return '0x' + sig.slice(0, 128) + newVHex
}

export function recoverSignerFromHash(hash, signature) {
  return ethers.utils.recoverAddress(hash, signature)
}

export function packSignatures(signatures) {
  // signatures: [{ signer, signature }]
  const sorted = signatures.slice().sort((a, b) => a.signer.toLowerCase().localeCompare(b.signer.toLowerCase()))
  const parts = sorted.map(s => {
    const sig = normalizeV(s.signature).slice(2)
    return sig
  })
  return '0x' + parts.join('')
}
