## How was this project built?

### Technologies Used

- **React**: The entire UI is built with React functional components and hooks, providing a modern, responsive, and maintainable frontend. The Context API is used for global Safe state management.
- **ethers.js**: Used for all blockchain interactions, including key generation, wallet management, contract deployment, and transaction signing. Its flexibility and reliability made it ideal for both local and remote (TPM) signing.
- **@safe-global/protocol-kit**: The official Safe SDK is used to predict, deploy, and interact with Safe contracts. This ensures compatibility with the Safe ecosystem and abstracts away much of the low-level contract logic.
- **Vite**: For fast, modern development and hot-reloading.
- **Node.js/Express (server/)**: Provides backend endpoints for Safe SDK operations and signature utilities, keeping sensitive logic off the client when needed.
- **Go (tpm-signing-agent/)**: The TPM server is written in Go to simulate a hardware-backed signing service. This demonstrates how a real HSM or TPM could be integrated for production security.
- **CSS Modules**: Used for component-scoped, modern styling.

### Architecture & Integration

- The app is structured as a desktop-style SPA, with clear separation between UI (React), blockchain logic (ethers.js, Safe SDK), and backend services (Node.js, Go TPM server).
- The SafeSetup flow is tightly integrated: key generation, TPM key fetch, Safe deployment, and auto-funding are all orchestrated in a single React component, with state managed via Context.
- The TPM server is called via HTTP to fetch a public key, and could be extended to sign transactions remotely for true hardware-backed security.
- The auto-funding logic after Safe deployment required careful handling of gas estimation, balance checks, and edge cases to ensure the Safe is always ready for use.

### Partner Technologies & Benefits

- **Safe protocol-kit**: Provided robust, well-tested abstractions for Safe deployment and transaction composition, saving significant development time and ensuring compatibility with the Safe ecosystem.
- **ethers.js**: Its comprehensive API for wallet and contract management made it easy to implement advanced flows like dynamic gas estimation, key generation, and transaction signing.
- **Go (for TPM server)**: Allowed for a simple, fast, and secure simulation of hardware-backed key management, demonstrating how a real HSM/TPM could be integrated.
- **Envio**: Used for blockchain indexing and event tracking. Envio made it easy to monitor Safe contract events, keep the UI in sync with on-chain activity, and build a responsive, real-time dashboard. Its developer-friendly APIs and fast indexing greatly improved the reliability and UX of the app.

### Notable Hacks & Engineering Details

- **Dynamic Auto-Funding**: Calculating the exact amount of ETH to send to the Safe after deployment (leaving just enough for gas) was non-trivial. It required a two-step gas estimation and a safety buffer to avoid transaction failures due to rounding or network fluctuations.
- **Fallback TPM Key**: If the TPM server is unavailable, the app automatically falls back to a hardcoded public key, ensuring the workflow is never blocked during demos or development.
- **Key Management UX**: The UI provides show/hide/copy controls for all keys, and prompts the user to save their private key securely, reducing the risk of accidental loss.
- **Predeployed Safe Support**: The app can instantly switch between a predeployed Safe (from .env) and a dynamically created one, making it ideal for both demos and real-world testing.
- **Composable Transaction UI**: The transaction composer is decoupled from Safe setup, so users can return and compose new transactions at any time, with full signature collection and error feedback.

---


# Safe Desktop: 2-of-3 Multisig Wallet

## What is this project?

**Safe Desktop** is a modern, end-to-end desktop application for managing a 2-of-3 multisig wallet (Safe) on Ethereum testnets. It is designed for developers, researchers, and advanced users who want to:

- Experiment with multisig wallet security and workflows
- Learn about threshold signatures and decentralized custody
- Integrate hardware-backed (TPM) key management into a Safe
- Rapidly test and compose transactions in a secure, user-friendly environment

This project is a full-stack, cross-platform proof-of-concept (PoC) that demonstrates how to:

- Generate and manage multiple cryptographic key pairs locally
- Integrate a remote signing service (TPM server) as a Safe owner
- Deploy a new Safe contract with custom owners and threshold
- Automatically fund the Safe after deployment, maximizing usability
- Compose, sign, and execute multisig transactions with clear UI feedback

It is built with React, ethers.js, and Safe protocol-kit, and is designed to be easily extended or adapted for research, hackathons, or as a foundation for production-grade multisig tools.

---

---


## Key Features

- **2-of-3 Multisig Safe**: Deploy and interact with a Safe contract that requires 2 out of 3 signatures for any transaction. This is the gold standard for secure, shared custody of digital assets.
- **Key Generation**: Securely generate two local key pairs. Key 1 is for the user (must be saved securely), Key 2 is for the app. Both are generated in-browser and never leave the user's machine.
- **TPM Server Integration**: Fetch a third public key from a TPM (Trusted Platform Module) server, simulating a hardware-backed key. If the server is unavailable, a fallback key is used for testing.
- **Predeployed Safe Support**: Instantly use a pre-existing Safe by providing its address in the `.env` file. This is useful for demos, testing, or recovery scenarios.
- **Dynamic Safe Deployment**: Deploy a new Safe contract with your chosen owners and threshold. The app guides you through the process, checks your balance, and provides faucet links for test ETH.
- **Auto-Funding**: After deployment, the app automatically sends all available ETH (minus estimated gas and a small buffer) from the deployer wallet to the Safe, so it is ready for transactions immediately.
- **Transaction Composer**: Create, sign, and send multisig transactions from the Safe. The UI walks you through transaction creation, signature collection, and execution.
- **Modern UI/UX**: Clean, responsive interface with clear feedback, error handling, and step-by-step guidance. Designed for both beginners and advanced users.

---

---


## Why does this project exist?

Multisig wallets are a critical building block for secure digital asset management, DAO treasuries, and collaborative finance. However, most multisig tools are:
- Web-based (less secure for key management)
- Opaque in their key handling and transaction flow
- Not easily extensible for research or integration with hardware security modules

**Safe Desktop** solves these problems by:
- Making all key management transparent and local-first
- Providing a clear, auditable workflow for every step
- Integrating a TPM server for hardware-backed key simulation
- Allowing both predeployed and dynamically created Safes
- Maximizing usability with auto-funding and modern UI

---

```
root/
│  electron.cjs, electron.main.js, index.html, package.json, vite.config.js
│
├─ src/
│   ├─ styles.css
│   ├─ lib/
│   │   └─ safeKit.js
│   └─ renderer/
│       ├─ App.jsx, App.css
│       ├─ main.jsx
│       ├─ components/
│       │   ├─ SafeSetup.jsx      # Key generation, Safe deployment, auto-funding
│       │   ├─ TxComposer.jsx     # Transaction creation, signing, sending
│       │   ├─ KeyGenerator.jsx   # Key pair generation UI
│       │   ├─ Modal.jsx, StatusPanel.jsx
│       ├─ context/
│       │   └─ SafeContext.jsx    # Global Safe state management
│       ├─ pages/
│       │   ├─ Dashboard.jsx, HyperIndexPage.jsx, TxLifecycle.jsx
│       └─ services/
│           ├─ safe-sdk.service.js, hyperindex.service.js, sig-utils.js
│
├─ indexer/   # Indexing and ABI files
├─ server/    # Backend API for Safe and signature utilities
├─ tpm-signing-agent/ # TPM server, Go code, and scripts
```

---


## How does it work? (Workflow)

### 1. Key Generation
Use the **SafeSetup** page to generate two local key pairs. Key 1 is for the user (must be saved securely), Key 2 is for the app. The TPM server public key is fetched as the third owner. All keys are shown with options to reveal/copy, and the user is prompted to save Key 1 securely.

### 2. Predeployed Safe Option
If `VITE_SAFE_ADDRESS` is set in `.env`, you can use a pre-existing Safe for instant testing. This is useful for demos or if you want to skip deployment.

### 3. Deploying a Dynamic Safe
Deploy a new Safe contract with the three owners (Key 1, Key 2, TPM key). The app checks the deployer wallet balance and provides faucet links if you need test ETH. After deployment, the app automatically funds the Safe with all available ETH (minus estimated gas and a small buffer), so you can immediately compose transactions.

### 4. Transaction Composer
After deployment or with a predeployed Safe, use the **TxComposer** to create, sign, and send multisig transactions. The UI guides you through entering transaction details, collecting signatures, and submitting the transaction to the Safe contract.

### 5. TPM Server Integration
The TPM server provides a public key for use as a Safe owner. This simulates a hardware-backed key for extra security. If the server is unavailable, a fallback key is used for testing.

---

### 1. Key Generation
- Use the **SafeSetup** page to generate two local key pairs.
- Key 1: User's private key (must be saved securely).
- Key 2: App's key (used for signing in the app).
- TPM server public key is fetched as the third owner.

### 2. Predeployed Safe Option
- If `VITE_SAFE_ADDRESS` is set in `.env`, you can use a pre-existing Safe for instant testing.

### 3. Deploying a Dynamic Safe
- Deploy a new Safe contract with the three owners (Key 1, Key 2, TPM key).
- The app checks the deployer wallet balance and prompts for test ETH if needed.
- After deployment, the app automatically funds the Safe with all available ETH (minus estimated gas and a small buffer).

### 4. Transaction Composer
- After deployment or with a predeployed Safe, use the **TxComposer** to:
  - Create new transactions from the Safe.
  - Sign with local keys.
  - Submit transactions to the Safe contract.

### 5. TPM Server Integration
- The TPM server provides a public key for use as a Safe owner.
- If the server is unavailable, a fallback key is used for testing.

---


## How do I use it?

1. **Install dependencies**
	```sh
	npm install
	# or
	pnpm install
	```

2. **Set up environment variables**
	- Create a `.env` file with:
	  ```env
	  VITE_RPC_URL=YOUR_SEPOLIA_RPC_URL
	  VITE_CHAIN_ID=11155111
	  VITE_SAFE_ADDRESS= # (optional, for predeployed Safe)
	  ```

3. **Start the TPM server (optional, for real signing)**
	- See `tpm-signing-agent/README.md` for setup.

4. **Run the app**
	```sh
	npm run dev
	# or
	pnpm dev
	```

---


## Architecture & File/Component Overview

- **SafeSetup.jsx**: Handles key generation, TPM key fetch, Safe deployment, and auto-funding logic.
- **TxComposer.jsx**: UI for composing, signing, and sending Safe transactions.
- **KeyGenerator.jsx**: UI for generating and displaying key pairs.
- **SafeContext.jsx**: React context for Safe state (keys, addresses, etc).
- **App.jsx**: Main app shell and navigation.
- **Dashboard.jsx, HyperIndexPage.jsx, TxLifecycle.jsx**: Pages for activity, indexing, and transaction lifecycle.
- **server/**: Backend for Safe SDK and signature utilities.
- **tpm-signing-agent/**: TPM server and Go code for secure key management.

---


## Security & Best Practices
- Always save your Key 1 private key securely. Losing it means losing access to your Safe.
- Only use testnets (Sepolia) for development.
- The TPM server is for demonstration; do not use in production without review.

---


## Credits & Acknowledgements
- Built with [Safe protocol-kit](https://github.com/safe-global/safe-core-sdk), [ethers.js](https://docs.ethers.org/), and React.
- TPM server based on Go and Node.js integration.

---


## License
MIT

