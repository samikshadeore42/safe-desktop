import React, { useState } from 'react'
import { createSafeTxOnServer, submitSafeTxToServer } from '../services/safe.service'

export default function TxComposer() {
  const [to, setTo] = useState('')
  const [value, setValue] = useState('0.01')
  const [data, setData] = useState('')
  const [log, setLog] = useState('')

  async function onCreate() {
    setLog('Creating safe transaction...')
    const res = await createSafeTxOnServer({ to, value, data })
    setLog(JSON.stringify(res, null, 2))
  }

  async function onSubmit() {
    setLog('Requesting local signatures...')
    // PoC: sign both using local Wallet (safe.service handles it in this starter)
    const serverRes = await submitSafeTxToServer({ to, value, data, executeWith: 'metamask' })
    setLog(JSON.stringify(serverRes, null, 2))

    if (serverRes.execTxRequest) {
      // ask user to confirm send via MetaMask (if using MetaMask) or sign with the desktop wallet
      setLog('execTxRequest ready — open MetaMask or use desktop execution.')
    }
  }

  return (
    <div className="card">
      <h3>Compose Transaction</h3>
      <label>To</label>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." />
      <label>Value (ETH)</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <label>Data (hex)</label>
      <input value={data} onChange={(e) => setData(e.target.value)} placeholder="0x" />
      <div className="row">
        <button onClick={onCreate}>Create (server)</button>
        <button onClick={onSubmit}>Sign & Build Exec</button>
      </div>
      <pre className="log">{log}</pre>
    </div>
  )
}
