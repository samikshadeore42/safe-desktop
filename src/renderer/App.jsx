import React, { useState } from "react";
import TxComposer from "./components/TxComposer";
import StatusPanel from "./components/StatusPanel";
import HyperIndexPage from "./pages/HyperIndexPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'hyperindex':
        return <HyperIndexPage safeAddress="0x601778F8fa32298E826a8aBEf1E3b31515626845" chainId={11155111} />;
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
        </nav>
      </header>

      <main className="main">
        {renderPage()}
      </main>
    </div>
  );
}
