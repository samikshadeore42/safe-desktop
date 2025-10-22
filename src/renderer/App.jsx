import React from 'react'
import TxComposer from './components/TxComposer'
import StatusPanel from './components/StatusPanel'

export default function App() {
  return (
    <div className="app">
      <header className="header">Safe Desktop — PoC</header>
      <main className="main">
        <TxComposer />
        <StatusPanel />
      </main>
    </div>
  )
}
