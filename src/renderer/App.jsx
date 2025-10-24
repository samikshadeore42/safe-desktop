import React, { useState } from "react";
import TxComposer from "./components/TxComposer";
import StatusPanel from "./components/StatusPanel";
import HyperIndexPage from "./pages/HyperIndexPage";
import Dashboard from "./pages/Dashboard";
import TxLifecycle from "./pages/TxLifecycle";


export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [safeAddress, setSafeAddress] = useState('0x601778F8fa32298E826a8aBEf1E3b31515626845');
  const [chainId, setChainId] = useState(11155111); // Sepolia

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard safeAddress={safeAddress} chainId={chainId} />;
      case 'hyperindex':
        return <HyperIndexPage safeAddress={safeAddress} chainId={chainId} />;
      case 'tx-lifecycle':
        return <TxLifecycle safeAddress={safeAddress} />;
      case 'home':
      default:
        return (
          <>
            <TxComposer onNavigate={setCurrentPage} />
            <StatusPanel />
          </>
        );
    }
  };

  return (
    <div className="app">
      <header className="header">
        Safe Desktop — PoC
        <nav style={{ marginLeft: "20px" }}>
          <button 
            onClick={() => setCurrentPage('home')} 
            style={{ marginRight: 10, padding: '5px 10px', cursor: 'pointer' }}
          >
            Home
          </button>
          <button 
            onClick={() => setCurrentPage('hyperindex')}
            style={{ padding: '5px 10px', cursor: 'pointer' }}
          >
            HyperIndex
          </button>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            style={{ marginRight: 10, padding: '5px 10px', cursor: 'pointer' }}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setCurrentPage('tx-lifecycle')}
            style={{ padding: '5px 10px', cursor: 'pointer' }}
          >
            Tx Lifecycle
          </button>
        </nav>
      </header>

      <main className="main">
        {renderPage()}
      </main>
    </div>
  );
}
