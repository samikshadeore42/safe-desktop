import React from 'react'

export default function StatusPanel() {
  return (
    <div className="card">
      <h3>Status</h3>
      <p>Connected: <code>{window.desktop?.health?.() ?? 'no'}</code></p>
      <p>Pairing token: <code>{window.desktop?.pairingToken?.()}</code></p>
    </div>
  )
}
