import React, { useState } from "react";
import TxComposer from "./components/TxComposer";
import StatusPanel from "./components/StatusPanel";
import HyperIndexPage from "./pages/HyperIndexPage";
import Dashboard from "./pages/Dashboard";
import TxLifecycle from "./pages/TxLifecycle";
import SafeSetup from './components/SafeSetup.jsx';
import KeyGenerator from './components/KeyGenerator.jsx';
import { SafeProvider } from './context/SafeContext';
import styles from "./App.module.css";

// You would typically import icons here, e.g.:
// import { FaWallet, FaPaperPlane, FaArrowDown, FaList, FaBoxes, FaCog } from 'react-icons/fa';
// import { BiCube, BiHomeAlt } from 'react-icons/bi';

export default function App() {
  const [currentPage, setCurrentPage] = useState('safe-setup'); // Start with SafeSetup
  const [safeAddress, setSafeAddress] = useState('0x601778f8fa32298e826a8abef1e3b31515626845');
  const [chainId, setChainId] = useState(11155111); // Sepolia

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <>
            <TxComposer onNavigate={setCurrentPage} />
            <StatusPanel />
          </>
        );
      case 'safe-setup':
        return <SafeSetup onNavigate={setCurrentPage} />;
      case 'dashboard':
        return <Dashboard safeAddress={safeAddress} chainId={chainId} />;
      case 'hyperindex':
        return <HyperIndexPage safeAddress={safeAddress} chainId={chainId} />;
      case 'tx-lifecycle':
        return <TxLifecycle safeAddress={safeAddress} />;
      default:
        return <SafeSetup />; // Default to SafeSetup
    }
  };

  return (
    <SafeProvider>
      <div className={styles.app}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}> {/* New div for header content */}
            <div className={styles.sidebarTitle}>
              {/* Replace with your logo/icon here, e.g., <FaBitcoin /> */}
              <span className={styles.iconPlaceholder}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M311.9 260.8L160 353.6 8 260.8 160 0 311.9 260.8zM160 383.4L8 290.6 160 512 312 290.6 160 383.4z"/></svg></span>
              <span className={styles.sidebarTitleText}>Safe Desktop</span> {/* Text "Transactions" next to icon */}
            </div>
          </div>
          <nav className={styles.nav}>
            <button
              onClick={() => setCurrentPage('safe-setup')}
              className={styles.navBtn + (currentPage === 'safe-setup' ? ' ' + styles.active : '')}
            >
              <span className={styles.iconPlaceholder}>🏠</span> {/* Placeholder for icon */}
              Safe Setup
            </button>
            <button
              onClick={() => setCurrentPage('hyperindex')}
              className={styles.navBtn + (currentPage === 'hyperindex' ? ' ' + styles.active : '')}
            >
              <span className={styles.iconPlaceholder}>📊</span> {/* Placeholder for icon */}
              HyperIndex
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={styles.navBtn + (currentPage === 'dashboard' ? ' ' + styles.active : '')}
            >
              <span className={styles.iconPlaceholder}>📈</span> {/* Placeholder for icon */}
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('tx-lifecycle')}
              className={styles.navBtn + (currentPage === 'tx-lifecycle' ? ' ' + styles.active : '')}
            >
              <span className={styles.iconPlaceholder}>🔄</span> {/* Placeholder for icon */}
              Tx Lifecycle
            </button>
            {/* Add more buttons mimicking Sparrow Wallet's structure */}
          </nav>
        </aside>

        <main className={styles.main}>
          <div className={styles.contentPage}>
            {renderPage()}
          </div>
        </main>
      </div>
    </SafeProvider>
  );
}