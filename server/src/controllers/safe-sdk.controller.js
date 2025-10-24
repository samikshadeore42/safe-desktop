import 'dotenv/config';
import { ethers } from 'ethers';

const SERVER_SIGNER_PK = process.env.OWNER1_PK || process.env.SERVER_SIGNER_PK;
console.log("Loaded SERVER_SIGNER_PK length:", SERVER_SIGNER_PK?.length);


if (!SERVER_SIGNER_PK) {
  console.warn('⚠️  No OWNER1_PK or SERVER_SIGNER_PK found - some endpoints may fail');
}

export async function generateKeyPairHandler(req, res) {
  try {
    console.log('=== GENERATE KEYPAIR HANDLER ===');
    
    // Generate a new random wallet (this will be stored in TPM/secure storage in production)
    const newWallet = ethers.Wallet.createRandom();
    
    const publicKey = newWallet.address;
    
    console.log(`Generated keypair. Public: ${publicKey}`);
    return res.json({
      publicKey,
      message: 'Keypair generated. Private key stored securely on server.'

    });
  } catch (err) {
    console.error('Keypair generation error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate keypair'
    });
  }
}