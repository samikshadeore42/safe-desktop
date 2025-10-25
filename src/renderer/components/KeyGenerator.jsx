import React, { useState } from 'react';
import { ethers } from 'ethers'; // Make sure ethers is imported
import styles from './KeyGenerator.module.css';

// Helper component for the copy button
const CopyButton = ({ textToCopy, onCopy, isCopied }) => (
  <button onClick={() => onCopy(textToCopy)} className={styles.actionButton} disabled={isCopied}>
    {isCopied ? 'Copied!' : 'Copy'}
  </button>
);

export default function KeyGenerator() {
  const [keyPairs, setKeyPairs] = useState(null); // Will hold { key1: {...}, key2: {...} }
  const [error, setError] = useState('');
  
  // State for Key 1 visibility
  const [showMnemonic1, setShowMnemonic1] = useState(false);
  const [showPrivateKey1, setShowPrivateKey1] = useState(false);
  
  // State for Key 2 visibility
  const [showMnemonic2, setShowMnemonic2] = useState(false);
  const [showPrivateKey2, setShowPrivateKey2] = useState(false);

  const [copiedKey, setCopiedKey] = useState(null); // 'key1-address', 'key2-private', etc.

  const handleGenerateKeyPair = () => {
    try {
      // Use ethers.Wallet.createRandom() to get the mnemonic
      const wallet1 = ethers.Wallet.createRandom();
      const wallet2 = ethers.Wallet.createRandom();

      setKeyPairs({
        key1: {
          publicKey: wallet1.address,
          privateKey: wallet1.privateKey,
          mnemonic: wallet1.mnemonic.phrase,
        },
        key2: {
          publicKey: wallet2.address,
          privateKey: wallet2.privateKey,
          mnemonic: wallet2.mnemonic.phrase,
        }
      });
      
      setError('');
      // Reset all visibility on new generation
      setShowMnemonic1(false);
      setShowPrivateKey1(false);
      setShowMnemonic2(false);
      setShowPrivateKey2(false);
      setCopiedKey(null); // Reset copy status
    } catch (err) {
      setError(`Failed to generate key pair: ${err.message}`);
      setKeyPairs(null);
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
        Generate new Ethereum key pairs. 
        <strong>This is for testing only.</strong>
        Store your private keys and mnemonic phrases securely!
      </p>
      <button 
        className={styles.generateButton}
        onClick={handleGenerateKeyPair}
      >
        Generate New Key Pairs
      </button>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {keyPairs && (
        <div className={styles.keyInfo}>
          
          {/* --- KEY 1 SECTION --- */}
          <h3>Key 1</h3>
          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Public Address</span>
              <CopyButton 
                textToCopy={keyPairs.key1.publicKey}
                onCopy={() => handleCopy('key1-address', keyPairs.key1.publicKey)}
                isCopied={copiedKey === 'key1-address'}
              />
            </div>
            <code className={styles.keyValue}>{keyPairs.key1.publicKey}</code>
          </div>

          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Private Key</span>
              <div className={styles.keyActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => setShowPrivateKey1(!showPrivateKey1)}
                >
                  {showPrivateKey1 ? 'Hide' : 'Show'}
                </button>
                <CopyButton 
                  textToCopy={keyPairs.key1.privateKey}
                  onCopy={() => handleCopy('key1-private', keyPairs.key1.privateKey)}
                  isCopied={copiedKey === 'key1-private'}
                />
              </div>
            </div>
            {/* Conditionally render the code block */}
            {showPrivateKey1 ? (
              <code className={styles.keyValue}>
                {keyPairs.key1.privateKey}
              </code>
            ) : (
              <code className={`${styles.keyValue} ${styles.hiddenValue}`}>
                ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
              </code>
            )}
          </div>

          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Mnemonic Phrase</span>
              <div className={styles.keyActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => setShowMnemonic1(!showMnemonic1)}
                >
                  {showMnemonic1 ? 'Hide' : 'Show'}
                </button>
                <CopyButton 
                  textToCopy={keyPairs.key1.mnemonic}
                  onCopy={() => handleCopy('key1-mnemonic', keyPairs.key1.mnemonic)}
                  isCopied={copiedKey === 'key1-mnemonic'}
                />
              </div>
            </div>
            {/* Conditionally render the code block */}
            {showMnemonic1 ? (
              <code className={styles.keyValue}>
                {keyPairs.key1.mnemonic}
              </code>
            ) : (
              <code className={`${styles.keyValue} ${styles.hiddenValue}`}>
                ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
              </code>
            )}
          </div>

          {/* --- KEY 2 SECTION --- */}
          <h3>Key 2</h3>
          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Public Address</span>
              <CopyButton 
                textToCopy={keyPairs.key2.publicKey}
                onCopy={() => handleCopy('key2-address', keyPairs.key2.publicKey)}
                isCopied={copiedKey === 'key2-address'}
              />
            </div>
            <code className={styles.keyValue}>{keyPairs.key2.publicKey}</code>
          </div>

          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Private Key</span>
              <div className={styles.keyActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => setShowPrivateKey2(!showPrivateKey2)}
                >
                  {showPrivateKey2 ? 'Hide' : 'Show'}
                </button>
                <CopyButton 
                  textToCopy={keyPairs.key2.privateKey}
                  onCopy={() => handleCopy('key2-private', keyPairs.key2.privateKey)}
                  isCopied={copiedKey === 'key2-private'}
                />
              </div>
            </div>
            {/* Conditionally render the code block */}
            {showPrivateKey2 ? (
              <code className={styles.keyValue}>
                {keyPairs.key2.privateKey}
              </code>
            ) : (
              <code className={`${styles.keyValue} ${styles.hiddenValue}`}>
                ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
              </code>
            )}
          </div>

          <div className={styles.keyField}>
            <div className={styles.keyHeader}>
              <span className={styles.keyLabel}>Mnemonic Phrase</span>
              <div className={styles.keyActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => setShowMnemonic2(!showMnemonic2)}
                >
                  {showMnemonic2 ? 'Hide' : 'Show'}
                </button>
                <CopyButton 
                  textToCopy={keyPairs.key2.mnemonic}
                  onCopy={() => handleCopy('key2-mnemonic', keyPairs.key2.mnemonic)}
                  isCopied={copiedKey === 'key2-mnemonic'}
                />
              </div>
            </div>
            {/* Conditionally render the code block */}
            {showMnemonic2 ? (
              <code className={styles.keyValue}>
                {keyPairs.key2.mnemonic}
              </code>
            ) : (
              <code className={`${styles.keyValue} ${styles.hiddenValue}`}>
                ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
              </code>
            )}
          </div>
          
          {/* --- Security Warning --- */}
          <div className={styles.warningBox}>
            <h4>⚠️ Important Security Information</h4>
            <ul>
              <li><strong>Never</strong> share your private keys or mnemonics with anyone.</li>
              <li>This information will not be shown again once you navigate away.</li>
              <li>Losing this information will result in permanent loss of access.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}