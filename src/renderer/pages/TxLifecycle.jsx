import React, { useEffect, useState } from "react";
import { fetchTxLifecycleData } from "../services/hyperindex.service";
import styles from "./TxLifecycle.module.css";

const SEPOLIA_EXPLORER_URL = "https://sepolia.etherscan.io";

/**
 * Formats a long address or hash (e.g., 0x...)
 */
function truncateAddress(address) {
  if (!address || address === '-') return "-";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Formats a Wei value into an ETH string
 */
function formatAmountWei(value) {
  try {
    const eth = Number(value) / 1e18;
    if (eth === 0) return "0";
    return eth.toFixed(6);
  } catch {
    return "0";
  }
}

/**
 * Formats a Unix timestamp into a readable date string
 */
function formatTimestamp(timestamp) {
  try {
    if (!timestamp || Number(timestamp) === 0) return "---";
    const date = new Date(Number(timestamp) * 1000);
    if (isNaN(date.getTime())) return "Invalid Date";
    
    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return "Invalid Date";
  }
}

export default function TxLifecycle({ safeAddress }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const txs = await fetchTxLifecycleData(safeAddress);
        setTransactions(txs);
      } catch (e) {
        setError(e.message || "Failed to load transactions");
      }
      setLoading(false);
    }
    load();
  }, [safeAddress]);

  const getStatusClass = (status) => {
    if (!status) return styles.status;
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus.includes("success")) return `${styles.status} ${styles.success}`;
    if (lowerStatus.includes("fail")) return `${styles.status} ${styles.failed}`;
    if (lowerStatus.includes("pending")) return `${styles.status} ${styles.pending}`;
    // Add more statuses as needed
    if (lowerStatus.includes("proposed")) return `${styles.status} ${styles.proposed}`;
    if (lowerStatus.includes("signed")) return `${styles.status} ${styles.signed}`;
    
    return styles.status;
  };

  // --- Render Functions for States ---
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          Loading transactions...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>Error: {error}</div>
      </div>
    );
  }
  
  if (!transactions.length) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Transaction Lifecycle</h1>
        <div className={styles.emptyState}>No transactions found for this Safe.</div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Transaction Lifecycle</h1>
      <p className={styles.subtle}>
        A complete history of all proposed, signed, and executed transactions.
      </p>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>To</th>
              <th>Value (ETH)</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td className={styles.hashCell}>
                  <a 
                    href={`${SEPOLIA_EXPLORER_URL}/address/${tx.to}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <code>{truncateAddress(tx.to)}</code>
                  </a>
                </td>
                <td className={styles.valueCell}>
                  {formatAmountWei(tx.value)}
                </td>
                <td>
                  <span className={getStatusClass(tx.status)}>
                    {tx.status}
                  </span>
                </td>
                <td className={styles.dateCell}>
                  {formatTimestamp(tx.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}