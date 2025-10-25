# TPM Unsealer Server

This server provides Ethereum-compatible signing using secp256k1 private keys that are sealed (encrypted) by a TPM and only unsealed when authorized. This approach gives you TPM-based key protection while maintaining full secp256k1 compatibility for Ethereum transactions.

## Architecture

1. **Key Generation**: A secp256k1 private key is generated in software using secure random generation
2. **Key Sealing**: The private key is sealed/encrypted by the TPM and stored persistently 
3. **Runtime Unsealing**: The TPM server unseals the key only when proper authorization is provided
4. **Software Signing**: Signatures are generated in software using the unsealed key with full Ethereum compatibility

## Benefits

- ✅ **TPM Protection**: Private key material is encrypted by TPM, cannot be trivially exfiltrated
- ✅ **Ethereum Compatible**: Full secp256k1 support with proper signature formats
- ✅ **Authorization Control**: Key unsealing requires TPM authorization (PCR states, passwords, etc.)
- ✅ **Software Flexibility**: No limitations of TPM's native crypto capabilities

## Usage

### Starting the Server

```bash
# Build the server
go build -o unseal-server main.go

# Run with cached key (recommended for performance)
sudo ./unseal-server -tmp-handle 0x81010002 -port 8080 -cache=true

# Run with per-request unsealing (more secure but slower)
sudo ./unseal-server -tpm-handle 0x81010002 -port 8080 -cache=false
```

### Command Line Options

- `-tpm-handle`: TPM persistent handle or context file containing the sealed key (default: 0x81010002)
- `-port`: HTTP server port (default: 8080)  
- `-cache`: Cache unsealed private key in memory vs unseal per request (default: true)

### API Endpoints

#### GET /address
Returns the Ethereum address derived from the sealed private key.

```bash
curl http://localhost:8080/address
```

Response:
```json
{
  "address": "0x70839DfD37Ab4812919FeF52B97c3CD0C41220c9"
}
```

#### POST /sign
Signs a 32-byte transaction hash (or any 32-byte digest).

```bash
curl -X POST http://localhost:8080/sign \
  -H "Content-Type: application/json" \
  -d '{"txHashHex":"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"}'
```

Response:
```json
{
  "signature": "e096318ac7ecf21df6c01e1c099fdcb716dd8183f4a767d0da98bcbe66f4ab331ede584725a0aebda97d8b5d532ab550bf5b6979fb0bf4806dabf4f685bdb86c",
  "signatureWithV": "e096318ac7ecf21df6c01e1c099fdcb716dd8183f4a767d0da98bcbe66f4ab331ede584725a0aebda97d8b5d532ab550bf5b6979fb0bf4806dabf4f685bdb86c00",
  "v": 0,
  "legacyV": 27,
  "r": "e096318ac7ecf21df6c01e1c099fdcb716dd8183f4a767d0da98bcbe66f4ab33",
  "s": "1ede584725a0aebda97d8b5d532ab550bf5b6979fb0bf4806dabf4f685bdb86c",
  "address": "0x70839DfD37Ab4812919FeF52B97c3CD0C41220c9"
}
```

## Security Considerations

### Caching Mode (cache=true)
- **Pros**: Better performance, key unsealed once at startup
- **Cons**: Private key remains in memory throughout server lifetime
- **Best for**: Secure environments where memory protection is adequate

### Per-Request Mode (cache=false)  
- **Pros**: Private key only briefly in memory per signing operation
- **Cons**: Performance overhead of TPM unseal per signature
- **Best for**: High-security environments where minimizing key exposure time is critical

### TPM Authorization
The server requires `sudo` because TPM operations typically need elevated privileges. In production, consider:
- Running as dedicated TPM user with appropriate permissions
- Configuring TPM authorization policies (PCR-based, password-based, etc.)
- Using systemd or similar for proper service management

## Testing

Run the included test script:

```bash
node test_unsealer.cjs
```

This tests address retrieval and transaction signing functionality.

## Comparison with Native TPM Signing

| Aspect | TPM Native ECC | Software secp256k1 + TPM Sealing |
|--------|----------------|-----------------------------------|
| Ethereum Compatibility | ❌ Limited | ✅ Full |
| Key Protection | ✅ Hardware | ✅ Hardware (encrypted) |
| Performance | ⚡ Fast | 🐌 Slower (unseal overhead) |
| Flexibility | ❌ TPM constraints | ✅ Full software control |
| Recovery ID | ❌ Complex/unreliable | ✅ Standard |

This unsealer approach provides the best balance of security and compatibility for Ethereum applications.
