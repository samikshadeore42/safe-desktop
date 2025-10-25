# TPM Signing Agent - Deployment Guide

This directory contains a complete TPM-based signing solution that can be packaged with Electron apps for secure key management.

## 📁 Files Overview

### Core Scripts
- **`start-tpm-server.sh`** - Simple one-click deployment script (🎯 **USE THIS**)
- **`setup-and-run.sh`** - Advanced setup script with full control
- **`process.md`** - Original manual setup instructions

### Binaries (Auto-generated)
- **`tpm-signing-server`** - Main signing server binary
- **`key-generator`** - Key generation utility binary

### Source Directories
- **`create_key/`** - Key generation source code
- **`unseal_server/`** - Preferred server implementation (unseals from TPM)
- **`signer/`** - Alternative server (direct TPM signing)

## 🚀 Quick Start (For End Users)

### Option 1: Simple Deployment (Recommended)
```bash
# One command setup and run
./start-tmp-server.sh
```

This will:
1. Check for existing TPM setup
2. Install dependencies if needed (asks for password)
3. Build binaries if needed
4. Generate keys and seal to TPM (first time only)
5. Start the server on port 8080

### Option 2: Manual Control
```bash
# Install TPM tools
./setup-and-run.sh --install-deps

# Build binaries
./setup-and-run.sh --build

# Setup TPM keys (one time)
./setup-and-run.sh --setup

# Start server
./setup-and-run.sh --start --port 8080

# Check status
./setup-and-run.sh --status

# Stop server
./setup-and-run.sh --stop
```

## 🔧 For Electron App Developers

### Packaging with Electron

1. **Copy this entire directory** into your Electron app's resources:
   ```
   your-electron-app/
   ├── resources/
   │   └── tpm-signing-agent/
   │       ├── start-tpm-server.sh      ← Main script
   │       ├── setup-and-run.sh         ← Advanced script
   │       ├── create_key/              ← Source code
   │       ├── unseal_server/           ← Source code
   │       └── ...
   ```

2. **Start the TPM server** from your Electron main process:
   ```javascript
   const { spawn } = require('child_process');
   const path = require('path');
   
   // Start TPM server
   const tpmServerPath = path.join(__dirname, 'resources', 'tpm-signing-agent');
   const tpmProcess = spawn('./start-tpm-server.sh', [], {
     cwd: tpmServerPath,
     stdio: 'pipe'
   });
   
   tpmProcess.stdout.on('data', (data) => {
     console.log('TPM Server:', data.toString());
   });
   ```

3. **Use the API** from your renderer process:
   ```javascript
   // Get Ethereum address
   const addressResponse = await fetch('http://localhost:8080/address');
   const { address } = await addressResponse.json();
   
   // Sign transaction
   const signResponse = await fetch('http://localhost:8080/sign', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ 
       txHashHex: '0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164' 
     })
   });
   const signature = await signResponse.json();
   ```

### Pre-built Distribution

For faster deployment, you can pre-build the binaries:

```bash
# Build for current platform
./setup-and-run.sh --build

# The binaries are now ready:
# - tpm-signing-server
# - key-generator

# Package these with your Electron app
```

## 🔒 Security Architecture

### Key Storage
- **Private key generated** using secp256k1 curve
- **Sealed into TPM** with `fixedtpm|fixedparent|userwithauth` attributes
- **Hardware-protected** - can only be unsealed by the same TPM
- **Never stored in plaintext** on disk

### Signing Process
1. Client sends transaction hash to `/sign` endpoint
2. Server unseals private key from TPM into memory
3. Server signs using standard Ethereum ECDSA
4. Private key immediately zeroed from memory
5. Returns signature with proper v/r/s values

### Handle Management
- Script automatically finds next available TPM persistent handle
- Handles stored in `.tpm-config` file
- Multiple apps can coexist with different handles

## 📡 API Endpoints

### GET /address
Returns the Ethereum address derived from the TPM-sealed key.

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8C17C2b9e39dC18f4"
}
```

### POST /sign
Signs a transaction hash using the TPM-sealed private key.

**Request:**
```json
{
  "txHashHex": "0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164"
}
```

**Response:**
```json
{
  "signature": "304402207...",      // 64-byte r+s
  "signatureWithV": "304402207...", // 65-byte r+s+v  
  "v": 0,                          // Recovery ID (0 or 1)
  "legacyV": 27,                   // Legacy format (27 or 28)
  "r": "7a8b9c...",               // R component
  "s": "1d2e3f...",               // S component
  "address": "0x742d35..."        // Signing address
}
```

## 🐛 Troubleshooting

### TPM Not Found
```bash
# Check TPM availability
ls -la /dev/tpm*

# Enable TPM in BIOS/UEFI
# Or install TPM simulator:
sudo apt-get install swtpm swtpm-tools
```

### Permission Denied
```bash
# Add user to tss group
sudo usermod -a -G tss $USER
# Logout and login again
```

### Server Won't Start
```bash
# Check status and logs
./setup-and-run.sh --status

# View server logs
tail -f tpm-server.log
```

### Clean Start
```bash
# Remove all data and start fresh
./setup-and-run.sh --clean
./start-tpm-server.sh
```

## 🏗️ Build Requirements

- **Go 1.19+** for building binaries
- **TPM 2.0** hardware or simulator
- **tpm2-tools** package for TPM operations
- **Linux/Unix** environment (Windows WSL supported)

## 📝 Files Generated

After setup, these files are created:
- `.tpm-config` - TPM handle configuration
- `.server-pid` - Running server process ID
- `tpm-server.log` - Server runtime logs
- `keys/` - Directory with TPM context files
- `tpm-signing-server` - Server binary
- `key-generator` - Key generation binary

## 🔄 Integration Example

Complete Electron integration example:

```javascript
// main.js
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let tpmProcess = null;

app.whenReady().then(() => {
  // Start TPM server
  const tpmDir = path.join(__dirname, 'resources', 'tpm-signing-agent');
  tpmProcess = spawn('./start-tpm-server.sh', [], { 
    cwd: tmpDir,
    detached: true
  });
  
  // Create window after TPM is ready
  setTimeout(createWindow, 5000);
});

app.on('before-quit', () => {
  // Clean shutdown
  if (tmpProcess) {
    spawn('./setup-and-run.sh', ['--stop'], { 
      cwd: path.join(__dirname, 'resources', 'tpm-signing-agent')
    });
  }
});

// renderer.js
async function signTransaction(txHash) {
  try {
    const response = await fetch('http://localhost:8080/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHashHex: txHash })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Signing failed:', error);
    throw error;
  }
}
```

## 🎯 Summary

This TPM signing agent provides:

✅ **Hardware Security** - Keys sealed in TPM chip  
✅ **Ethereum Compatible** - Standard ECDSA signatures  
✅ **Easy Deployment** - One-script setup  
✅ **Electron Ready** - Designed for app packaging  
✅ **Multi-Platform** - Linux, macOS, Windows (WSL)  
✅ **Production Ready** - Error handling, logging, cleanup  

Perfect for Electron apps requiring secure key management! 🔐✨
