# TPM Signing Agent - Deployment Checklist

## 📦 Files to Package with Electron App

### Required Files (Must Include)
```
tpm-signing-agent/
├── start-tpm-server.sh      ← Main Linux/macOS launcher
├── start-tpm-server.bat     ← Main Windows launcher  
├── setup-and-run.sh         ← Advanced setup script
├── create_key/              ← Key generation source
│   ├── go.mod
│   ├── go.sum
│   └── main.go
└── unseal_server/           ← Server source (preferred)
    ├── go.mod
    ├── go.sum
    └── main.go
```

### Optional Pre-built Binaries (Faster Startup)
```
tpm-signing-agent/
├── tpm-signing-server       ← Pre-built server binary
└── key-generator           ← Pre-built key generator
```

## 🚀 Electron Integration Steps

### 1. Package Structure
```javascript
// In your electron app's build configuration
"extraResources": [
  {
    "from": "tpm-signing-agent",
    "to": "tpm-signing-agent"
  }
]
```

### 2. Main Process Integration
```javascript
// main.js
const { app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let tpmProcess = null;

app.whenReady().then(async () => {
  // Start TPM server
  const tpmDir = path.join(process.resourcesPath, 'tpm-signing-agent');
  const scriptName = process.platform === 'win32' ? 
    'start-tmp-server.bat' : 'start-tpm-server.sh';
  
  tmpProcess = spawn(scriptName, [], {
    cwd: tpmDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32'
  });
  
  tpmProcess.stdout.on('data', (data) => {
    console.log('TPM:', data.toString());
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Create your main window
  createWindow();
});

app.on('before-quit', () => {
  if (tpmProcess) {
    // Graceful shutdown
    const tmpDir = path.join(process.resourcesPath, 'tpm-signing-agent');
    spawn('./setup-and-run.sh', ['--stop'], { cwd: tmpDir });
  }
});
```

### 3. Renderer Process Usage
```javascript
// renderer.js
class TPMSigner {
  constructor(baseUrl = 'http://localhost:8081') {
    this.baseUrl = baseUrl;
  }
  
  async getAddress() {
    const response = await fetch(`${this.baseUrl}/address`);
    if (!response.ok) throw new Error('Failed to get address');
    const data = await response.json();
    return data.address;
  }
  
  async signHash(txHashHex) {
    const response = await fetch(`${this.baseUrl}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHashHex })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Signing failed: ${error}`);
    }
    
    return await response.json();
  }
}

// Usage
const signer = new TPMSigner();

// Get address
const address = await signer.getAddress();
console.log('TPM Address:', address);

// Sign transaction
const signature = await signer.signHash('0xce092d40...');
console.log('Signature:', signature);
```

## 🔧 Platform-Specific Notes

### Linux
- Requires `tpm2-tools` package
- User may need to be in `tss` group
- Script handles installation automatically

### macOS  
- Requires TPM simulator (no hardware TPM)
- Uses Homebrew for `tpm2-tools`
- Script handles installation automatically

### Windows
- Requires WSL (Windows Subsystem for Linux)
- TPM 2.0 hardware should be enabled in BIOS
- Uses `.bat` launcher that calls WSL scripts

## 🎯 User Experience Flow

### First Time Setup
1. User launches Electron app
2. App detects no TPM configuration
3. Shows setup dialog: "This app uses hardware security. Setup required."
4. User clicks "Setup" → Script runs automatically
5. Progress shown: Installing tools → Generating keys → Starting server
6. App ready to use

### Subsequent Launches
1. User launches Electron app  
2. App detects existing TPM configuration
3. Quickly starts TPM server (2-3 seconds)
4. App ready to use

## 🛡️ Security Considerations

### Key Protection
- Private key sealed with `fixedtpm|fixedparent|userwithauth`
- Can only be unsealed by same TPM chip
- Never stored in plaintext
- Automatically zeroed from memory after use

### Network Security
- Server only listens on localhost (127.0.0.1)
- No external network access
- Can add API keys/tokens if needed

### Process Security
- Server runs with minimal privileges
- Clean shutdown on app exit
- Logs can be disabled for production

## 📋 Testing Checklist

### Before Packaging
- [ ] Test on each target platform
- [ ] Verify TPM tools installation
- [ ] Test key generation and sealing
- [ ] Test server startup and API
- [ ] Test graceful shutdown
- [ ] Test error handling

### After Packaging
- [ ] Test on clean systems without Go installed
- [ ] Test on systems without TPM tools
- [ ] Test permission dialogs
- [ ] Test multiple app instances
- [ ] Test app updates (preserve keys)

## 🚨 Error Handling

### Common Issues
1. **No TPM Hardware**
   - Graceful fallback to software keys
   - Clear error message to user
   
2. **Permission Denied**
   - Guide user to enable TPM in BIOS
   - Instructions for adding to `tss` group
   
3. **Port Already in Use**
   - Automatic port detection
   - Kill existing processes
   
4. **Build Failures**
   - Pre-built binaries as fallback
   - Clear error messages

## 📝 Production Deployment

### Electron Builder Configuration
```json
{
  "extraResources": [
    {
      "from": "tpm-signing-agent",
      "to": "tpm-signing-agent",
      "filter": [
        "**/*",
        "!node_modules",
        "!*.log",
        "!keys",
        "!.tpm-config"
      ]
    }
  ],
  "afterPack": "./scripts/post-pack.js"
}
```

### Code Signing
- Sign the Electron app normally
- TPM binaries don't need separate signing
- Consider notarization for macOS

This deployment package provides a complete, secure, and user-friendly TPM signing solution for your Electron app! 🔐✨
