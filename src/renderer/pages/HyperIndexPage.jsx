import React, { useEffect, useMemo, useState } from "react";
import {
  fetchLatestExecutions,
  fetchLatestMultiSigTx,
} from "../services/hyperindex.service";
import styles from "./HyperIndexPage.module.css";

const SEPOLIA_EXPLORER_URL = "https://sepolia.etherscan.io";

function formatAmountWei(value) {
  try {
    const eth = Number(value) / 1e18;
    if (eth === 0) return "0";
    return eth.toFixed(6);
  } catch {
    return value;
  }
}

// New function to format timestamps
function formatTimestamp(timestamp) {
  try {
    // Handle null, undefined, or 0
    if (!timestamp || Number(timestamp) === 0) return "-";

    const numTimestamp = Number(timestamp);
    let date;

    if (isNaN(numTimestamp)) {
      // It's not a number, assume it's an ISO string
      date = new Date(timestamp);
    } else if (String(timestamp).length <= 11) {
      // It's a number-like string, <= 11 digits. Assume seconds.
      date = new Date(numTimestamp * 1000);
    } else {
      // It's a long number-like string. Assume milliseconds.
      date = new Date(numTimestamp);
    }

    // Final check if the date object is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch (e) {
    console.error("Failed to format timestamp:", timestamp, e);
    return "Invalid Date";
  }
}

export default function HyperIndexPage({ safeAddress, chainId = 11155111 }) {
  const [execRows, setExecRows] = useState([]);
  const [multiSigRows, setMultiSigRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const safe = useMemo(() => (
    typeof safeAddress === "string" ? safeAddress.toLowerCase() : ""
  ), [safeAddress]);

  const load = async () => {
    try {
      setErr("");
      const [execs, multisig] = await Promise.all([
        fetchLatestExecutions(safe, 10),
        fetchLatestMultiSigTx(safe, 10),
      ]);
    
      setExecRows(execs);
      setMultiSigRows(multisig);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!safe) return;
    setLoading(true);
    load();
    const id = setInterval(load, 5000); // Auto-refresh
    return () => clearInterval(id);
  }, [safe, chainId]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HyperIndex Activity Feed</h1>
      
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.safeInfo}>
          <span>Safe:</span> <code>{safe}</code>
        </div>
        <div className={styles.chainInfo}>
          <span>Chain:</span> <code>{chainId}</code>
        </div>
      </div>

      {/* Status Indicators */}
      {loading && !err && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <span>Loading activity...</span>
        </div>
      )}
      {err && <div className={styles.error}>Error: {err}</div>}

      {/* Execution Feed Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Execution Feed</h2>
        <p className={styles.subtle}>
          Latest on-chain outcomes (ExecutionSuccess / ExecutionFailure)
        </p>
        {!loading && execRows.length === 0 ? (
          <div className={styles.emptyState}>No executions found yet.</div>
        ) : (
          execRows.map((r) => {
            const isFailure = r.id.includes('ExecutionFailure');
            return (
              <div key={r.id} className={`${styles.card} ${isFailure ? styles.failure : styles.success}`}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>
                    {isFailure ? 'Execution Failure' : 'Execution Success'}
                  </span>
                  
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Tx Hash</span>
                    <a href={`${SEPOLIA_EXPLORER_URL}/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
                      <code>{r.txHash}</code> ↗
                    </a>
                  </div>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Payment</span>
                    <span className={styles.cardValue}>{formatAmountWei(r.payment)} ETH</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Multisig Transactions Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Multisig Transactions</h2>
        <p className={styles.subtle}>Decoded SafeMultiSigTransaction logs (new proposals)</p>
        {!loading && multiSigRows.length === 0 ? (
          <div className={styles.emptyState}>No multisig transactions found.</div>
        ) : (
          multiSigRows.map((r) => (
            <div key={r.id} className={`${styles.card} ${styles.multisig}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>New Multisig Tx</span>
                <span className={styles.cardTimestamp}>
                  {formatTimestamp(r.timestamp)}
                </span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>To</span>
                  <code className={styles.cardValue}>{r.to}</code>
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Value</span>
                  <span className={`${styles.cardValue} ${styles.valueEth}`}>
                    {formatAmountWei(r.value)} ETH
                  </span>
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Operation</span>
                  <span className={styles.cardValue}>{r.operation}</span>
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Tx Hash</span>
                  <a href={`${SEPOLIA_EXPLORER_URL}/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
                    <code>{r.txHash}</code> ↗
                  </a>
                </div>
                {/* Collapsible section for less important data */}
                <details className={styles.details}>
                  <summary>More Details</summary>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Data</span>
                    <code className={styles.cardValueSmall}>{r.data}</code>
                  </div>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Gas</span>
                    <code className={styles.cardValueSmall}>safeTxGas={r.safeTxGas}, baseGas={r.baseGas}</code>
                  </div>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Refund</span>
                    <code className={styles.cardValueSmall}>token={r.gasToken}, receiver={r.refundReceiver}</code>
                  </div>
                </details>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}