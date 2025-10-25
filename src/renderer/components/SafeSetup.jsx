import React, { useState } from 'react';
import { ethers } from 'ethers';
import Safe from '@safe-global/protocol-kit';
import TxComposerSDK from './TxComposer.jsx';
import { useSafe } from '../context/SafeContext';

// Import the new CSS Module file
import styles from './SafeSetup.module.css'; 

const RPC_URL = import.meta.env.VITE_RPC_URL;
const CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID || 11155111);
const SERVER_URL = 'http://localhost:3000';

const PREDEFINED_SAFE = import.meta.env.VITE_SAFE_ADDRESS;

export default function SafeSetup() {
  const { 
    keyPairs, setKeyPairs,
    safeInfo, setSafeInfo,
    serverPublicKey, setServerPublicKey,
    usePredefinedSafe, setUsePredefinedSafe
  } = useSafe();
  
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [checkedBalance, setCheckedBalance] = useState(false);
  const [fetchedServerKey, setFetchedServerKey] = useState(null);

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


  const handleGenerateTwoKeys = () => {
    try {
      setUsePredefinedSafe(false); // Reset to dynamic Safe mode
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

      setStatus('✅ Generated two keypairs. Please SAVE the private key of Key 1 securely!');
      setError('');
    } catch (err) {
      setError('❌ Failed to generate key pairs: ' + err.message);
      setStatus('');
    }
  };

  // Fetch server public key from TPM endpoint with fallback
  const handleGetServerPublicKey = async () => {
    try {
      setError('');
      setStatus('Fetching server public key from TPM...');
      
      const response = await fetch('http://localhost:8080/address', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch server address: ${response.statusText}`);
      }
      
      const data = await response.json();
      const serverAddress = data.address;
      
      setServerPublicKey(serverAddress);
      setFetchedServerKey(serverAddress);
      setStatus(`✅ Server public key fetched: ${serverAddress}\nNote: This key is managed by the TPM server`);
    } catch (err) {
      // console.warn('TPM server unavailable, using fallback address:', err.message);
      
      // Fallback to hardcoded address if TPM server is unavailable
      const fallbackAddress = "0x70839DfD37Ab4812919FeF52B97c3CD0C41220c9";
      
      setServerPublicKey(fallbackAddress);
      setFetchedServerKey(fallbackAddress);
      setStatus(`⚠️ TPM server unavailable, using fallback address: ${fallbackAddress}\nNote: This is a fallback key for testing when TPM server is offline`);
      setError(''); // Clear error since we have a fallback
    }
  };

  const handleDeploySafe = async () => {
    if (!keyPairs || !serverPublicKey || !fetchedServerKey) {
      setError('Please generate keys and get server public key first.');
      return;
    }
    try {
      setStatus('⏳ Deploying Safe contract...');
      setError('');

      const owners = [
        keyPairs.key1.address,
        keyPairs.key2.address,
        fetchedServerKey, // Use the dynamically fetched server key
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
      
      // Create a wallet from the private key for deployment
      const wallet = new ethers.Wallet(keyPairs.key1.privateKey, new ethers.providers.JsonRpcProvider(RPC_URL));
      
      // Create and send the deployment transaction
      const deploymentTx = await protocolKit.createSafeDeploymentTransaction();
      
      // Check wallet balance
      const balance = await wallet.getBalance();
      console.log('Wallet balance:', ethers.utils.formatEther(balance), 'ETH');
      
      if (balance.isZero()) {
        const faucetLinks = `
          • Alchemy Sepolia Faucet: https://sepoliafaucet.com/
          • Sepolia PoW Faucet: https://sepolia-faucet.pk910.de/
          • Infura Sepolia Faucet: https://faucet.sepolia.dev/
        `;
        throw new Error(`Account ${wallet.address} has no ETH. Please fund this address with some Sepolia ETH first.\n\nYou can get test ETH from these faucets:\n${faucetLinks}`);
      }

      // Set manual gas limit and higher gas price for Sepolia
      const txResponse = await wallet.sendTransaction({
        to: deploymentTx.to,
        data: deploymentTx.data,
        value: deploymentTx.value || '0',
        gasLimit: 1000000, // Manual gas limit
        maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'), // Higher gas price
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
        type: 2 // EIP-1559 transaction
      });
      
      setStatus('⏳ Waiting for deployment transaction to be mined...');
      await txResponse.wait();

      const newSafeInfo = { address: predictedAddress, privateKey: keyPairs.key1.privateKey };
      setSafeInfo(newSafeInfo);
      setStatus(`✅ Safe deployed at: ${predictedAddress}`);
      setError('');

      saveKeyAndAddressToFile(keyPairs.key1.privateKey, predictedAddress);
    } catch (err) {
      setError(`❌ ${err.message}`);
      setStatus('');
    }
  };

  if (showComposer && (safeInfo || (usePredefinedSafe && PREDEFINED_SAFE))) {
    const safeToUse = usePredefinedSafe ? PREDEFINED_SAFE : safeInfo.address;
    // Use generated keys if available, otherwise empty strings
    const owner1KeyToUse = keyPairs?.key1?.privateKey || '';
    const owner2KeyToUse = keyPairs?.key2?.privateKey || '';
    return (
      <TxComposerSDK
        safeAddress={safeToUse}
        owner1Key={owner1KeyToUse}
        owner2Key={owner2KeyToUse}
        onNavigate={(page) => {
          if (page === 'safe-setup') {
            setShowComposer(false);
          }
        }}
      />
    );
  }

  const checkBalance = async () => {
    if (!keyPairs) {
      setError('❌ Please generate keys first');
      return;
    }

    try {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const balance = await provider.getBalance(keyPairs.key1.address);
      const balanceInEth = ethers.utils.formatEther(balance);
      setCheckedBalance(true);
      
      if (balance.isZero()) {
        setStatus(`Current balance: ${balanceInEth} ETH\nYou need Sepolia ETH to deploy a Safe. Click "Get Test ETH" to visit faucets.`);
      } else {
        setStatus(`✅ Current balance: ${balanceInEth} ETH\nYou have enough ETH to proceed!`);
      }
    } catch (err) {
      setError('❌ Failed to check balance: ' + err.message);
    }
  };

  const handleGetTestEth = () => {
    if (!keyPairs) {
      setError('❌ Please generate keys first');
      return;
    }
    
    const faucets = [
      `https://sepoliafaucet.com/`,
      `https://sepolia-faucet.pk910.de/`,
      `https://faucet.sepolia.dev/`
    ];
    
    setStatus(`
Opening Sepolia faucets in new tabs. 
Your address to fund: ${keyPairs.key1.address}

1. Copy your address above
2. Visit each faucet
3. Request test ETH
4. Wait a few minutes
5. Click "Check Balance" to verify
    `);
    faucets.forEach(url => window.open(url, '_blank'));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Safe 2-of-3 Multisig Setup</h1>

      {/* Status messages are now at the top for better visibility */}
      {status && <div className={styles.status}>{status}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!usePredefinedSafe && !safeInfo && PREDEFINED_SAFE && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🚀 Quick Start Option
          </h2>
          <p>Use an existing pre-deployed Safe to start testing immediately:</p>
          <button 
            className={`${styles.button} ${styles.btnPurple}`}
            onClick={() => {
              setUsePredefinedSafe(true);
              setShowComposer(true);
            }}
          >
            Use Pre-deployed Safe ({PREDEFINED_SAFE.substring(0, 6)}...{PREDEFINED_SAFE.substring(38)})
          </button>
          <p className={styles.note}>Or continue below to deploy your own Safe</p>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.stepNumber}>1</span>
          Generate 2 Local Key Pairs
        </h2>
        <button className={`${styles.button} ${styles.btnGreen}`} onClick={handleGenerateTwoKeys}>
          Generate Keys
        </button>
        {keyPairs && (
          <>
            <div className={`${styles.infoBox} ${styles.warning}`}>
              <h3>Key 1 (Save privately!)</h3>
              <div className={styles.keyItem}>
                <label>Address</label>
                <code className={styles.code}>{keyPairs.key1.address}</code>
              </div>
              <div className={styles.keyItem}>
                <label>Private Key</label>
                <code className={styles.code}>{keyPairs.key1.privateKey}</code>
              </div>
              <div className={styles.keyItem}>
                <label>Mnemonic</label>
                <code className={styles.code}>{keyPairs.key1.mnemonic}</code>
              </div>

              <h3>Key 2 (For App Use)</h3>
              <div className={styles.keyItem}>
                <label>Address</label>
                <code className={styles.code}>{keyPairs.key2.address}</code>
              </div>
              <div className={styles.keyItem}>
                <label>Private Key</label>
                <code className={`${styles.code} ${styles.obscured}`}>
                  {keyPairs.key2.privateKey}
                </code>
              </div>
            </div>
            
            {!usePredefinedSafe && (
              <div className={`${styles.infoBox} ${styles.info}`}>
                <h3>Get Sepolia Test ETH</h3>
                <p>You need some test ETH (for <strong>Key 1</strong>) to deploy your Safe.</p>
                <div className={styles.buttonGroup}>
                  <button className={`${styles.button} ${styles.btnOrange}`} onClick={handleGetTestEth}>
                    Get Test ETH
                  </button>
                  <button className={`${styles.button} ${styles.btnBlue}`} onClick={checkBalance}>
                    Check Balance
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.stepNumber}>2</span>
          Get Server Public Key
        </h2>
        <p>Request the server's public key. The server will generate and securely store its private key.</p>
        <button className={`${styles.button} ${styles.btnGreen}`} onClick={handleGetServerPublicKey}>
          Request Server Key
        </button>
        {serverPublicKey && (
          <div className={`${styles.infoBox} ${styles.success}`}>
            <p><strong>Server Public Key:</strong></p>
            <code className={styles.code}>{serverPublicKey}</code>
            <p className={styles.note}>Note: The server securely manages its own private key.</p>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.stepNumber}>3</span>
          Deploy Safe Contract
        </h2>
        <button 
          className={`${styles.button} ${styles.btnBlue}`} 
          onClick={handleDeploySafe}
          disabled={!keyPairs || !serverPublicKey}
        >
          Deploy Safe
        </button>
      </div>

      {safeInfo && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🎉 Next Steps
          </h2>
          <p>Your new Safe is deployed! You can now proceed to the transaction composer.</p>
          <p><strong>Safe Address:</strong></p>
          <code className={styles.code}>{safeInfo.address}</code>
          <button
            className={`${styles.button} ${styles.btnPurple}`}
            onClick={() => setShowComposer(true)}
          >
            Open Transaction Composer
          </button>
        </div>
      )}
    </div>
  );
}