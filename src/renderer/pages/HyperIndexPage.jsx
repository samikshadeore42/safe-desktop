import React, { useEffect, useMemo, useState } from "react";
import {
  fetchLatestExecutions,
  fetchLatestMultiSigTx,
} from "../services/hyperindex.service";

function formatAmountWei(value) {
  try {
    return (Number(value) / 1e18).toFixed(6);
  } catch {
    return value;
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
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [safe, chainId]);

  return (
    <div style={styles.container}>
      <h1>HyperIndex: Multisig Activity</h1>
      <div style={{ marginBottom: 12, color: "#555" }}>
        Safe: <code>{safe}</code> — Chain: <code>{chainId}</code>
      </div>

      {loading && <div>Loading...</div>}
      {err && <div style={styles.error}>Error: {err}</div>}

      <section style={styles.section}>
        <h2>Execution Feed</h2>
        <p style={styles.subtle}>
          Latest on-chain outcomes (ExecutionSuccess / ExecutionFailure)
        </p>
        {execRows.length === 0 ? (
          <div style={styles.muted}>No executions found yet.</div>
        ) : (
          execRows.map((r) => (
            <div key={r.id} style={styles.card}>
              <div>
                id: <code>{r.id}</code>
              </div>
              <div>
                Tx: <code>{r.txHash}</code>
              </div>
              <div>Payment: {r.payment}</div>
              {/* <div>
                Time: {new Date(Number(r.timestamp) * 1000).toLocaleString()}
              </div> */}
            </div>
          ))
        )}
      </section>

      <section style={styles.section}>
        <h2>Multisig Transactions</h2>
        <p style={styles.subtle}>Decoded SafeMultiSigTransaction logs</p>
        {multiSigRows.length === 0 ? (
          <div style={styles.muted}>No multisig transactions found.</div>
        ) : (
          multiSigRows.map((r) => (
            <div key={r.id} style={styles.card}>
              <div>
                To: <code>{r.to}</code>
              </div>
              <div>Value: {formatAmountWei(r.value)} ETH</div>
              <div>Data: {r.data}</div>

              <div>Operation: {r.operation}</div>
              <div>
                Gas: safeTxGas={r.safeTxGas} baseGas={r.baseGas}
              </div>
              <div>
                Refund: token={r.gasToken} receiver={r.refundReceiver}
              </div>
              <div>
                Tx: <code>{r.txHash}</code>
              </div>
              <div>
                Time: {r.timestamp}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

const styles = {
  container: { maxWidth: 1000, margin: "0 auto", padding: 20, fontFamily: "Inter, Arial" },
  section: { marginTop: 18, paddingTop: 8, borderTop: "1px solid #eee" },
  card: {
    padding: 10,
    border: "1px solid #eee",
    borderRadius: 6,
    marginBottom: 8,
    background: "#fafafa",
  },
  error: { color: "#b00020", background: "#ffeaea", padding: 8, borderRadius: 6 },
  subtle: { color: "#666", marginTop: -4 },
  muted: { color: "#777" },
};
