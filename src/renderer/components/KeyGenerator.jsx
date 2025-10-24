import React, { useState } from 'react';
import { generateKeyPair } from '../services/safe-sdk.service';

export default function KeyGenerator() {
  const [keyPair, setKeyPair] = useState(null);
  const [error, setError] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);

  const handleGenerateKeyPair = () => {
    try {
      const newKeyPair = generateKeyPair();
      setKeyPair(newKeyPair);
      setError('');
    } catch (err) {
      setError(`Failed to generate key pair: ${err.message}`);
      setKeyPair(null);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Key Pair Generator</h2>
      <p style={styles.description}>
        Generate a new Ethereum key pair for use with Safe multisig. 
        Make sure to securely store your private key and mnemonic phrase!
      </p>
      
      <button 
        style={styles.button} 
        onClick={handleGenerateKeyPair}
      >
        Generate New Key Pair
      </button>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {keyPair && (
        <div style={styles.keyInfo}>
          <h3>Generated Key Pair:</h3>
          
          <div style={styles.keySection}>
            <h4>Public Address:</h4>
            <p style={styles.keyText}>{keyPair.publicKey}</p>
          </div>

          <div style={styles.keySection}>
            <h4>Private Key:</h4>
            <p style={styles.keyText}>{keyPair.privateKey}</p>
          </div>

          <div style={styles.keySection}>
            <h4>
              Mnemonic Phrase:
              <button 
                style={styles.toggleButton}
                onClick={() => setShowMnemonic(!showMnemonic)}
              >
                {showMnemonic ? 'Hide' : 'Show'}
              </button>
            </h4>
            {showMnemonic && (
              <p style={styles.keyText}>{keyPair.mnemonic}</p>
            )}
          </div>

          <div style={styles.warningBox}>
            <h4>⚠️ Important Security Information:</h4>
            <ul>
              <li>Save your private key and mnemonic phrase securely</li>
              <li>Never share your private key or mnemonic phrase with anyone</li>
              <li>This information will not be shown again</li>
              <li>The private key and mnemonic give complete control of this address</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  description: {
    marginBottom: '20px',
    color: '#666',
  },
  button: {
    padding: '12px 20px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  keyInfo: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  keySection: {
    marginBottom: '20px',
  },
  keyText: {
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    margin: '8px 0',
  },
  error: {
    marginTop: '10px',
    padding: '12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  warningBox: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderRadius: '4px',
    border: '1px solid #ffe0b2',
  },
  toggleButton: {
    marginLeft: '10px',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  }
};