import React, { useEffect, useState } from "react";
import { fetchTxLifecycleData } from "../services/hyperindex.service";

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

  if (loading) return <div>Loading transactions...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!transactions.length) return <div>No transactions found.</div>;

  return (
    <div>
      <h1>Transaction Lifecycle</h1>
      <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Tx Hash</th>
            <th>To</th>
            <th>Value</th>
            <th>Status</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.txHash || "-"}</td>
              <td>{tx.to}</td>
              <td>{tx.value}</td>
              <td>{tx.status}</td>
              <td>{new Date(tx.timestamp * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
