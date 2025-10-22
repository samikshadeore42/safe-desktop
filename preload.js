import { contextBridge } from 'electron'
import { randomBytes } from 'crypto'

// For PoC we expose simple APIs. In production, keep minimal surface and strong checks.
contextBridge.exposeInMainWorld('desktop', {
  health: () => 'ok',
  // generate a random device pairing token (PoC)
  pairingToken: () => randomBytes(8).toString('hex'),
  // signDigest is implemented in the renderer safely using ethers Wallet for PoC
  // but here we could expose native signing hooks if using native keystore
})
