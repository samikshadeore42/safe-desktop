import React, { useState } from 'react';
import { ethers } from 'ethers';
import Safe from '@safe-global/protocol-kit';
import TxComposerSDK from './TxComposer.jsx';

const RPC_URL = import.meta.env.VITE_RPC_URL;
const CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID || 11155111);
const SERVER_URL = 'http://localhost:3000';

export default function SafeSetup() {
  const [keyPairs, setKeyPairs] = useState(null);
  const [serverPublicKey, setServerPublicKey] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [safeAddress, setSafeAddress] = useState(null);
  const [safeInfo, setSafeInfo] = useState(null); // { address, privateKey }
  const [showComposer, setShowComposer] = useState(false);

  const saveKeyAndAddressToFile = (privateKey, safeAddress) => {
    try {
      const content = `Private Key (Key 1):\n${privateKey}\n\nSafe Address:\n${safeAddress}\n`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'safe-key-and-address.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  };


  // Generate 2 local key pairs and show to user
  const handleGenerateTwoKeys = () => {
    try {
      const wallet1 = ethers.Wallet.createRandom();
      const wallet2 = ethers.Wallet.createRandom();

      setKeyPairs({
        key1: {
          address: wallet1.address,
          privateKey: wallet1.privateKey,
          mnemonic: wallet1.mnemonic.phrase,
        },
        key2: {
          address: wallet2.address,
          privateKey: wallet2.privateKey,
          mnemonic: wallet2.mnemonic.phrase,
        },
      });

      setStatus('Generated two keypairs. Please SAVE the private key of Key 1 securely!');
      setError('');
    } catch (err) {
      setError('Failed to generate key pairs: ' + err.message);
      setStatus('');
    }
  };

  // Return a hardcoded server public key for testing
  const handleGetServerPublicKey = () => {
    try {
      setError('');
      const hardcodedServerKey = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";  // This is a hardcoded key for testing
      setServerPublicKey(hardcodedServerKey);
      setStatus(`✅ Server public key: ${hardcodedServerKey}\nNote: This is currently a hardcoded key for testing`);
    } catch (err) {
      setError(`Failed to get server public key: ${err.message}`);
      setStatus('');
    }
  };

  // Deploy Safe with 3 owners: 2 local (key1 + key2) and server (public key)
  const handleDeploySafe = async () => {
    const hardcodedServerKey = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; //only for testing
    if (!keyPairs || !serverPublicKey) {
      setError('Please generate keys and get server public key first.');
      return;
    }
    try {
      setStatus('Deploying Safe contract...');
      setError('');

      const owners = [
        keyPairs.key1.address,
        keyPairs.key2.address,
        hardcodedServerKey, //replace it with serverPublicKey now its only for testing
      ];
      const threshold = 2;

      console.log('Deploying with owners:', owners);


      const signer = keyPairs.key1.privateKey;
      const protocolKit = await Safe.init({
        provider: RPC_URL,
        signer,
        predictedSafe: {
          safeAccountConfig: { owners, threshold }
        },
        chainId: CHAIN_ID
      });



      const predictedAddress = await protocolKit.getAddress();
    //   const deploymentTx = await protocolKit.createSafeDeploymentTransaction();
    //   const txResponse = await signer.sendTransaction({
    //     to: deploymentTx.to,
    //     data: deploymentTx.data,
    //     value: deploymentTx.value || '0'
    //   });
    //   await txResponse.wait();

      const newSafeInfo = { address: predictedAddress, privateKey: keyPairs.key1.privateKey };
      setSafeInfo(newSafeInfo);
      setStatus(`✅ Safe deployed at: ${predictedAddress}`);
      setError('');

      saveKeyAndAddressToFile(keyPairs.key1.privateKey, predictedAddress);
    } catch (err) {
      setError(`${err.message}`);
      setStatus('');
    }
  };

  if (showComposer && safeInfo) {
    return (
      <TxComposerSDK
        safeAddress={safeInfo.address}
        privateKey={safeInfo.privateKey}
      />
    );
  }

  return (
    <div style={styles.container}>
      <h1>Safe 2-of-3 Multisig Setup</h1>

      <div style={styles.section}>
        <h2>Step 1: Generate 2 Local Key Pairs</h2>
        <button style={styles.button} onClick={handleGenerateTwoKeys}>Generate Keys</button>
        {keyPairs && (
          <div style={styles.keyBox}>
            <h3>Key 1 (Save privately!)</h3>
            <p>Address: {keyPairs.key1.address}</p>
            <p>Private Key: <code>{keyPairs.key1.privateKey}</code></p>
            <p>Mnemonic: <code>{keyPairs.key1.mnemonic}</code></p>

            <h3>Key 2</h3>
            <p>Address: {keyPairs.key2.address}</p>
            <p>Private Key: <code>{keyPairs.key2.privateKey}</code></p>
            <p>Mnemonic: <code>{keyPairs.key2.mnemonic}</code></p>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2>Step 2: Get Server Public Key</h2>
        <p>Request the server's public key. The server will generate and securely store its private key.</p>
        <button style={styles.button} onClick={handleGetServerPublicKey}>Request Server Key</button>
        {serverPublicKey && (
          <div style={styles.keyInfo}>
            <p><strong>Server Public Key:</strong></p>
            <code style={styles.code}>{serverPublicKey}</code>
            <p style={styles.note}>Note: The server securely manages its own private key.</p>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2>Step 3: Deploy Safe Contract</h2>
        <button style={styles.deployButton} onClick={handleDeploySafe}>Deploy Safe</button>
      </div>

      {/* Show "Open Transaction Composer" button after deployment */}
      {safeInfo && (
        <div style={styles.section}>
          <h2>Next</h2>
          <p><strong>Safe:</strong> {safeInfo.address}</p>
          <button
            style={{ ...styles.deployButton, backgroundColor: '#8E44AD' }}
            onClick={() => setShowComposer(true)}
          >
            Open Transaction Composer
          </button>
        </div>
      )}

      {status && <p style={styles.status}>{status}</p>}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  container: { maxWidth: 900, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' },
  section: { marginBottom: 30, padding: 20, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#f9f9f9' },
  button: { padding: '12px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 },
  deployButton: { padding: '12px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 },
  keyBox: { backgroundColor: '#fff3cd', border: '2px solid #ff9800', borderRadius: 4, padding: 15 },
  status: { padding: 10, backgroundColor: '#e7f3ff', color: '#0066cc', borderRadius: 4, marginTop: 10, whiteSpace: 'pre-wrap' },
  error: { padding: 10, backgroundColor: '#ffe7e7', color: '#cc0000', borderRadius: 4, marginTop: 10 },
  keyInfo: { 
    backgroundColor: '#e8f5e9', 
    border: '1px solid #66bb6a',
    borderRadius: 8, 
    padding: 20,
    marginTop: 15 
  },
  code: { 
    display: 'block',
    padding: 15,
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: '14px',
    overflowWrap: 'break-word',
    marginTop: 10,
    marginBottom: 10
  },
  note: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    fontSize: '14px'
  }
};