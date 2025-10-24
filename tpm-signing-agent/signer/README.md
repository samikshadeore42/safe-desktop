# TPM Signing Server

A Go HTTP server that provides TPM-based Ethereum transaction signing capabilities.

## Features

- **GET /address**: Returns the Ethereum address derived from the TPM key
- **POST /sign**: Signs a transaction hash using the TPM and returns a normalized signature with v value
- **POST /verify**: Verifies signatures and recovers addresses for validation

## Prerequisites

- TPM 2.0 hardware or simulator
- Go 1.19 or later
- Required Go modules (see go.mod)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   go mod tidy
   ```

## Usage

### Starting the Server

```bash
go run main.go [flags]
```

### Command Line Flags

- `-tpm-path`: Path to TPM device (default: "/dev/tpmrm0")
- `-handle`: TPM key handle in hex (default: 0x81000000)
- `-port`: HTTP server port (default: "8080")

### Example

```bash
# Start server with default settings
go run main.go

# Start server with custom TPM handle and port
go run main.go -handle 0x81000001 -port 9090
```

## API Endpoints

### 1. Get Ethereum Address

**Endpoint**: `GET /address`

**Response**:
```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678"
}
```

### 2. Sign Transaction Hash

**Endpoint**: `POST /sign`

**Request Body**:
```json
{
  "txHashHex": "0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164"
}
```

**Response**:
```json
{
  "signature": "abcdef12...",      // 64-byte hex signature (r+s)
  "signatureWithV": "abcdef12...", // 65-byte hex signature (r+s+v)
  "v": 0,                         // Recovery ID (0 or 1)
  "r": "abcdef12...",             // 32-byte r component
  "s": "123456..."                // 32-byte s component
}
```

### 3. Verify Signature

**Endpoint**: `POST /verify`

**Request Body**:
```json
{
  "txHashHex": "0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164",
  "signature": "abcdef1234567890...",  // 64 or 65-byte hex signature
  "v": 0                             // Optional: explicit v value for 64-byte signatures
}
```

**Response**:
```json
{
  "valid": true,
  "recoveredAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "expectedAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "message": "Signature is valid!"
}
```

## Testing

Use the provided test script:

```bash
./test_server.sh
```

Or test manually with curl:

```bash
# Get address
curl -X GET http://localhost:8080/address

# Sign transaction
curl -X POST http://localhost:8080/sign \
  -H "Content-Type: application/json" \
  -d '{"txHashHex": "0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164"}'

# Verify signature
curl -X POST http://localhost:8080/verify \
  -H "Content-Type: application/json" \
  -d '{"txHashHex": "0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164", "signature": "YOUR_SIGNATURE_HERE"}'
```

## Integration with Safe SDK

The signature returned by the `/sign` endpoint is a 64-byte hex string that is compatible with Safe SDK. The signature is already normalized for Ethereum (s <= N/2) to prevent malleability attacks.

## Security Notes

- The server runs on localhost by default for security
- The TPM key handle must be pre-configured on your system
- Transaction hashes must be exactly 32 bytes (64 hex characters)
- The server validates all input parameters before processing

## Error Handling

The server returns appropriate HTTP status codes:
- `200 OK`: Successful operation
- `400 Bad Request`: Invalid input (malformed JSON, invalid hex, wrong hash length)
- `405 Method Not Allowed`: Wrong HTTP method
- `500 Internal Server Error`: TPM or signing errors

## Dependencies

- `github.com/ethereum/go-ethereum/crypto`: Ethereum cryptographic functions
- `github.com/google/go-tpm/tpm2`: TPM 2.0 library
- `github.com/google/go-tpm/tpmutil`: TPM utilities
- `github.com/salrashid123/tpmsigner`: TPM signing implementation
