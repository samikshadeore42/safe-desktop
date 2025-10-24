import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  getSafeInfo,
  createSafeTx,
  signLocallyWithSDK,
  getServerSignature,
  // executeTransaction,
  exeTxn,
  getLocalSignerAddress,
} from '../services/safe-sdk.service';

export default function TxComposerSDK() {
  const [safeInfo, setSafeInfo] = useState(null);
  const [formData, setFormData] = useState({
    to: '',
    value: '0.01', // Default to 0.01 ETH for testing
    data: '0x'
  });
  const [txData, setTxData] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSafeInfo();
  }, []);

  const loadSafeInfo = async () => {
    try {
      const info = await getSafeInfo();
      setSafeInfo(info);
    } catch (err) {
      setError(`Failed to load Safe: ${err.message}`);
    }
  };

  const handleCreate = async () => {
    try {
      setError('');
      setStatus('Creating transaction...');
      setSignatures([]);

      console.log("=== TRANSACTION CREATION DEBUG ===");
      console.log("Form value entered:", formData.value);
      console.log("Form value type:", typeof formData.value);
      
      // Validate that we're not sending 0 ETH
      if (!formData.value || formData.value === "0" || parseFloat(formData.value) === 0) {
        throw new Error("Cannot send 0 ETH. Please enter a value greater than 0.");
      }
      
      let valueInWei;
      try {
        // If the value looks like it's already in wei (very large number), use it directly
        if (formData.value.length > 15) {
          valueInWei = formData.value;
          console.log("Using value as wei directly:", valueInWei);
        } else {
          // Otherwise, treat it as ETH and convert to wei
          valueInWei = ethers.utils.parseEther(formData.value).toString();
          console.log("Converted ETH to wei:", valueInWei);
        }
        
        // Double-check that the final value is not zero
        if (valueInWei === "0") {
          throw new Error("Calculated value is 0 wei. Please enter a larger amount.");
        }
        
      } catch (e) {
        console.error("Value conversion error:", e.message);
        throw new Error(`Invalid value format: ${formData.value}. ${e.message}`);
      }
      
      console.log("Target address:", formData.to);
      console.log("Final value in wei:", valueInWei);
      console.log("Value in ETH:", ethers.utils.formatEther(valueInWei));
      
      const result = await createSafeTx({
        to: formData.to,
        value: valueInWei,
        data: formData.data
      });
      
      setTxData(result);
      setStatus('✅ Transaction created! Ready for signing.');
    } catch (err) {
      setError(`Failed to create: ${err.message}`);
      setStatus('');
    }
  };

  const handleSignBoth = async () => {
    try {
      setError('');
      setStatus('Getting signatures...');
      if (!txData) throw new Error('No transaction data');
      const sigs = [];
      setStatus('Getting signature from server (owner1)...');
      const serverSig = await getServerSignature(txData.safeTxHash);
      sigs.push(serverSig);
      setStatus('Signing locally (owner2)...');
      console.log(txData.safeTxHash);
      const localSig = await signLocallyWithSDK(txData.safeTxHash);
      sigs.push(localSig);
      setSignatures(sigs);
      setStatus(`✅ Got ${sigs.length} signatures! Ready to execute.`);
    } catch (err) {
      setError(`Failed to sign: ${err.message}`);
      setStatus('');
    }
  };

  const handleExecute = async () => {
    try {
      setError('');
      console.log('Attempting execution with signatures:', signatures);
      if (!signatures.every(sig => typeof sig === 'string' && sig.startsWith('0x') && sig.length >= 132)) {
        setError('At least one signature is invalid. Please collect both signatures again.');
        return;
      }
      setStatus('Executing transaction...');
      if (!txData || signatures.length === 0) {
        throw new Error('Missing transaction data or signatures');
      }
      const result = await exeTxn(
        txData.safeTransactionData,
        signatures,
        txData.safeTxHash
      );
      setStatus(`✅ Transaction executed! TxHash: ${result.txHash}`);
      setTimeout(() => loadSafeInfo(), 2000);
    } catch (err) {
      setError(`Failed to execute: ${err.message}`);
      setStatus('');
    }
  };

  const handleReset = () => {
    setFormData({ to: '', value: '0', data: '0x' });
    setTxData(null);
    setSignatures([]);
    setStatus('');
    setError('');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Safe 2-of-3 Multisig (Safe SDK)</h1>
      {safeInfo && (
        <div style={styles.infoBox}>
          <h3>Safe Information</h3>
          <p><strong>Address:</strong> {safeInfo.address}</p>
          <p><strong>Threshold:</strong> {safeInfo.threshold} of {safeInfo.owners.length}</p>
          <p><strong>Current Nonce:</strong> {safeInfo.nonce}</p>
          <p><strong>Deployed:</strong> {safeInfo.isDeployed ? '✅ Yes' : '❌ No'}</p>
          <details>
            <summary>Owners</summary>
            <ul>
              {safeInfo.owners.map((owner, i) => (
                <li key={i} style={styles.ownerItem}>{owner}</li>
              ))}
            </ul>
          </details>
          <p><strong>Local Signer:</strong> {getLocalSignerAddress()}</p>
        </div>
      )}
      <div style={styles.section}>
        <h2>Step 1: Compose Transaction</h2>
        <input
          style={styles.input}
          placeholder="To Address (0x...)"
          value={formData.to}
          onChange={(e) => setFormData({ ...formData, to: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Value in ETH (e.g., 0.01 for 0.01 ETH)"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Data (0x... or 0x for simple transfer)"
          value={formData.data}
          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
        />
        <button style={styles.button} onClick={handleCreate}>
          Create Transaction
        </button>
      </div>
      {txData && (
        <div style={styles.section}>
          <h2>Step 2: Collect Signatures</h2>
          <p style={styles.info}>SafeTxHash: <code>{txData.safeTxHash}</code></p>
          <p style={styles.info}>Nonce: {txData.safeTransactionData.nonce}</p>
          <button 
            style={styles.button} 
            onClick={handleSignBoth}
            disabled={signatures.length > 0}
          >
            {signatures.length > 0 ? '✅ Signatures Collected' : 'Get Signatures (Owner1 + Owner2)'}
          </button>
          {signatures.length > 0 && (
            <div style={styles.signaturesBox}>
              <p><strong>Signatures collected: {signatures.length}</strong></p>
              {signatures.map((sig, i) => (
                <p key={i} style={styles.sigItem}>
                  Sig {i + 1}: {sig.substring(0, 20)}...{sig.substring(sig.length - 20)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {txData && signatures.length >= 2 && (
        <div style={styles.section}>
          <h2>Step 3: Execute Transaction</h2>
          <p style={styles.info}>Ready to execute with {signatures.length} signatures</p>
          <button style={styles.executeButton} onClick={handleExecute}>
            Execute Transaction On-Chain
          </button>
        </div>
      )}
      {status && <p style={styles.status}>{status}</p>}
      {error && <p style={styles.error}>{error}</p>}
      {(txData || status || error) && (
        <button style={styles.resetButton} onClick={handleReset}>
          Reset / Start New Transaction
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    color: '#333'
  },
  infoBox: {
    padding: '15px',
    backgroundColor: '#e8f4f8',
    border: '1px solid #b3d9e6',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  ownerItem: {
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  section: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f9f9f9'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },
  button: {
    padding: '12px 20px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  executeButton: {
    padding: '12px 20px',
    fontSize: '16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  resetButton: {
    padding: '12px 20px',
    fontSize: '16px',
    backgroundColor: '#ff5722',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '20px'
  },
  info: {
    fontSize: '14px',
    color: '#555',
    wordBreak: 'break-all'
  },
  signaturesBox: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px'
  },
  sigItem: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#666'
  },
  status: {
    padding: '10px',
    backgroundColor: '#e7f3ff',
    color: '#0066cc',
    borderRadius: '4px',
    marginTop: '10px'
  },
  error: {
    padding: '10px',
    backgroundColor: '#ffe7e7',
    color: '#cc0000',
    borderRadius: '4px',
    marginTop: '10px'
  }
};
