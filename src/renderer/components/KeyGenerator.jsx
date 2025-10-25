import React, { useState } from 'react';
import { generateKeyPair } from '../services/safe-sdk.service';
import styles from './KeyGenerator.module.css';

// Helper component for the copy button
const CopyButton = ({ textToCopy, onCopy, isCopied }) => (
  <button onClick={() => onCopy(textToCopy)} className={styles.actionButton}>
    {isCopied ? 'Copied!' : 'Copy'}
  </button>
);

export default function KeyGenerator() {
  const [keyPair, setKeyPair] = useState(null);
  const [error, setError] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null); // 'address', 'private', or 'mnemonic'

  const handleGenerateKeyPair = () => {
    try {
      const newKeyPair = generateKeyPair();
      setKeyPair(newKeyPair);
      setError('');
      setShowMnemonic(false); // Hide on new generation
      setShowPrivateKey(false); // Hide on new generation
      setCopiedKey(null); // Reset copy status
    } catch (err) {
      setError(`Failed to generate key pair: ${err.message}`);
      setKeyPair(null);
    }
  };

  const handleCopy = (keyName, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000); // Reset after 2 seconds
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Key Pair Generator</h2>
      <p className={styles.description}>
        Generate a new Ethereum key pair. 
        <strong>This is for testing only.</strong>
        Store your private key and mnemonic phrase securely!
      </p>
      <button 
        className={styles.generateButton}
        onClick={handleGenerateKeyPair}
      >
        Generate New Key Pair
      </button>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {keyPair && (
        <div className={styles.keyInfo}>
          
          {/* --- Public Address --- */}
          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Public Address</span>
              <CopyButton 
                textToCopy={keyPair.publicKey}
                onCopy={() => handleCopy('address', keyPair.publicKey)}
                isCopied={copiedKey === 'address'}
              />
            </div>
            <code className={styles.keyValue}>{keyPair.publicKey}</code>
          </div>

          {/* --- Private Key --- */}
          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Private Key</span>
              <div className={styles.keyActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? 'Hide' : 'Show'}
                </button>
                <CopyButton 
                  textToCopy={keyPair.privateKey}
                  onCopy={() => handleCopy('private', keyPair.privateKey)}
                  isCopied={copiedKey === 'private'}
                />
              </div>
            </div>
            <code className={`${styles.keyValue} ${!showPrivateKey ? styles.obscured : ''}`}>
              {keyPair.privateKey}
            </code>
          </div>

          {/* --- Mnemonic Phrase --- */}
          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Mnemonic Phrase</span>
              <div className={styles.keyActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => setShowMnemonic(!showMnemonic)}
                >
                  {showMnemonic ? 'Hide' : 'Show'}
                </button>
                <CopyButton 
                  textToCopy={keyPair.mnemonic}
                  onCopy={() => handleCopy('mnemonic', keyPair.mnemonic)}
                  isCopied={copiedKey === 'mnemonic'}
                />
              </div>
            </div>
            <code className={`${styles.keyValue} ${!showMnemonic ? styles.obscured : ''}`}>
              {keyPair.mnemonic}
            </code>
          </div>
          
          {/* --- Security Warning --- */}
          <div className={styles.warningBox}>
            <h4>⚠️ Important Security Information</h4>
            <ul>
              <li><strong>Never</strong> share your private key or mnemonic with anyone.</li>
              <li>This information will not be shown again once you navigate away.</li>
              <li>Losing this information will result in permanent loss of access.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}