package main

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/sha256"
	"encoding/hex" // We'll use hex instead of base64
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"slices"
	"strings"

	// --- ETHEREUM LIBRARIES FOR SIGNATURE COMPATIBILITY ---
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	// -------------------------------------------------------

	// --- TPM LIBRARIES ---
	"github.com/google/go-tpm/tpm2"
	"github.com/google/go-tpm/tpmutil"
	"github.com/salrashid123/tpmsigner"
	// ---------------------
)

// ===== CONFIGURATION VARIABLES =====
// Command-line flags for TPM device and key handle
var (
	tpmPath = flag.String("tpm-path", "/dev/tpmrm0", "Path to the TPM device (character device or a Unix socket).")
	handle  = flag.Uint("handle", 0x81000000, "ecc Handle value") // Use your ECC handle
	port    = flag.String("port", "8080", "Port to run the HTTP server on")
)

// List of valid TPM device paths
var TPMDEVICES = []string{"/dev/tpm0", "/dev/tpmrm0"}

// Global variables for TPM signer and Ethereum address
var (
	globalTPMSigner  *tpmsigner.TPM
	globalEthAddress string
)

// Response structures
type AddressResponse struct {
	Address string `json:"address"`
}

type SignRequest struct {
	TxHashHex string `json:"txHashHex"`
}

type SignResponse struct {
	Signature      string `json:"signature"`         // 64-byte hex signature (r+s)
	SignatureWithV string `json:"signatureWithV"`    // 65-byte hex signature (r+s+v)
	V              int    `json:"v"`                 // Recovery ID (0 or 1, or 27/28 in legacy format)
	R              string `json:"r"`                 // 32-byte r component
	S              string `json:"s"`                 // 32-byte s component
	Warning        string `json:"warning,omitempty"` // Warning if v value is not verified
}

type VerifyRequest struct {
	TxHashHex string `json:"txHashHex"`
	Signature string `json:"signature"`   // Can be 64-byte (r+s) or 65-byte (r+s+v)
	V         *int   `json:"v,omitempty"` // Optional v value if not included in signature
}

type VerifyResponse struct {
	Valid            bool   `json:"valid"`
	RecoveredAddress string `json:"recoveredAddress,omitempty"`
	ExpectedAddress  string `json:"expectedAddress"`
	Message          string `json:"message"`
}

// ===== TPM CONNECTION HELPER =====
// Opens either a hardware TPM device or TCP connection to TPM simulator
func OpenTPM(path string) (io.ReadWriteCloser, error) {
	if slices.Contains(TPMDEVICES, path) {
		return tpmutil.OpenTPM(path) // Hardware TPM
	} else {
		return net.Dial("tcp", path) // TPM simulator over TCP
	}
}

// ===== TPM INITIALIZATION =====
// Initialize TPM signer and derive Ethereum address
func initializeTPM() error {
	// Connect to TPM hardware
	rwc, err := OpenTPM(*tpmPath)
	if err != nil {
		return fmt.Errorf("can't open TPM %q: %v", *tpmPath, err)
	}

	// Initialize TPM signer
	tpmConfig := &tpmsigner.TPM{
		TpmDevice:    rwc,
		Handle:       tpm2.TPMHandle(*handle),
		ECCRawOutput: true, // CRITICAL: Must be true for Ethereum compatibility
	}

	tpmSigner, err := tpmsigner.NewTPMCrypto(tpmConfig)
	if err != nil {
		rwc.Close()
		return fmt.Errorf("failed to initialize TPM signer: %v", err)
	}

	// Extract public key from TPM
	pubKey, ok := tpmSigner.Public().(*ecdsa.PublicKey)
	if !ok {
		rwc.Close()
		return fmt.Errorf("could not get public key from TPM signer")
	}
	// after extracting pubKey
	log.Printf("TPM public key curve: %v", pubKey.Curve.Params().Name)
	if pubKey.Curve != ethcrypto.S256() {
		log.Fatalf("TPM key curve is not secp256k1 — got %s. Ethereum requires secp256k1.", pubKey.Curve.Params().Name)
	}

	// Derive Ethereum address
	ethAddress := ethcrypto.PubkeyToAddress(*pubKey)

	// Store in global variables
	globalTPMSigner = tpmConfig
	globalEthAddress = ethAddress.Hex()

	log.Printf("TPM initialized successfully")
	log.Printf("  Ethereum Address: %s", globalEthAddress)

	return nil
}

// ===== SIGNATURE NORMALIZATION =====
// Normalize signature for Ethereum compatibility
func normalizeSignature(sigRaw []byte) []byte {
	rSig := new(big.Int).SetBytes(sigRaw[:32])
	sSig := new(big.Int).SetBytes(sigRaw[32:64])
	order := ethcrypto.S256().Params().N
	half := new(big.Int).Div(order, big.NewInt(2))

	// Ethereum requires signatures to have low 's' values (s <= N/2)
	if sSig.Cmp(half) > 0 {
		sSig.Sub(order, sSig) // Convert high s to low s
	}

	normalizedSig := make([]byte, 64)
	copy(normalizedSig[:32], rSig.FillBytes(make([]byte, 32)))
	copy(normalizedSig[32:], sSig.FillBytes(make([]byte, 32)))

	return normalizedSig
}

// ===== V VALUE DETERMINATION =====
// Find the correct recovery ID (v value) for a signature
func findRecoveryID(msgHash []byte, signature []byte, expectedAddr string) (int, error) {
	if len(signature) != 64 {
		return -1, fmt.Errorf("signature must be exactly 64 bytes")
	}

	log.Printf("Debug: Finding recovery ID for address %s", expectedAddr)
	log.Printf("Debug: Message hash: %s", hex.EncodeToString(msgHash))
	log.Printf("Debug: Signature: %s", hex.EncodeToString(signature))

	// Try both possible recovery IDs (0 and 1)
	for v := 0; v <= 100; v++ {
		// Create 65-byte signature with v value
		sigWithV := make([]byte, 65)
		copy(sigWithV[:64], signature)
		sigWithV[64] = byte(v)

		// Try to recover public key
		recoveredPubKey, err := ethcrypto.SigToPub(msgHash, sigWithV)
		if err != nil {
			log.Printf("Debug: v=%d recovery failed: %v", v, err)
			continue
		}

		// Get address from recovered public key
		recoveredAddr := ethcrypto.PubkeyToAddress(*recoveredPubKey)
		log.Printf("Debug: v=%d recovers to address: %s", v, recoveredAddr.Hex())

		// Check if it matches our expected address (case-insensitive)
		if strings.EqualFold(recoveredAddr.Hex(), expectedAddr) {
			log.Printf("Debug: Found matching v value: %d", v)
			return v, nil
		}
	}

	return -1, fmt.Errorf("could not find valid recovery ID - signature may be for different key or message")
}

// ===== HTTP HANDLERS =====

// Handler for getting Ethereum address
func getAddressHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := AddressResponse{
		Address: globalEthAddress,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Handler for signing transaction hash
func signTransactionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	if req.TxHashHex == "" {
		http.Error(w, "txHashHex is required", http.StatusBadRequest)
		return
	}

	// Remove 0x prefix if present
	hexStr := strings.TrimPrefix(req.TxHashHex, "0x")

	// Decode hex string to bytes
	txHashBytes, err := hex.DecodeString(hexStr)
	if err != nil {
		http.Error(w, "Invalid hex string", http.StatusBadRequest)
		return
	}

	if len(txHashBytes) != 32 {
		http.Error(w, "Transaction hash must be 32 bytes", http.StatusBadRequest)
		return
	}
	
	// Create a temporary signer instance for this request
	tmpSigner, err := tpmsigner.NewTPMCrypto(globalTPMSigner)
	if err != nil {
		http.Error(w, "Failed to create TPM signer", http.StatusInternalServerError)
		log.Printf("TPM signer creation error: %v", err)
		return
	}

	// Sign the hash with TPM
	sigRaw, err := tmpSigner.Sign(nil, txHashBytes, crypto.SHA256)
	if err != nil {
		http.Error(w, "Failed to sign transaction", http.StatusInternalServerError)
		log.Printf("Signing error: %v", err)
		return
	}

	// Normalize signature for Ethereum
	normalizedSig := normalizeSignature(sigRaw)

	log.Printf("Debug: Raw signature length: %d", len(sigRaw))
	log.Printf("Debug: Normalized signature: %s", hex.EncodeToString(normalizedSig))

	// Find the correct recovery ID (v value)
	v, err := findRecoveryID(txHashBytes, normalizedSig, globalEthAddress)
	if err != nil {
		// If recovery fails, it might be because TPM is double-hashing
		// Try with SHA256 of the hash
		hasher := sha256.New()
		hasher.Write(txHashBytes)
		doubleHash := hasher.Sum(nil)

		log.Printf("Debug: Trying with double hash: %s", hex.EncodeToString(doubleHash))
		v, err = findRecoveryID(doubleHash, normalizedSig, globalEthAddress)
		if err != nil {
			// If both fail, just pick v=0 and let the client handle verification
			log.Printf("Warning: Could not determine correct v value, defaulting to v=0")
			log.Printf("Addresses recovered: single hash v=0/1, double hash v=0/1")

			// Log what addresses would be recovered for debugging
			for testV := 0; testV <= 1; testV++ {
				sigWithV := make([]byte, 65)
				copy(sigWithV[:64], normalizedSig)
				sigWithV[64] = byte(testV)

				if recoveredPubKey, recErr := ethcrypto.SigToPub(txHashBytes, sigWithV); recErr == nil {
					recoveredAddr := ethcrypto.PubkeyToAddress(*recoveredPubKey)
					log.Printf("  Single hash v=%d: %s", testV, recoveredAddr.Hex())
				}

				if recoveredPubKey, recErr := ethcrypto.SigToPub(doubleHash, sigWithV); recErr == nil {
					recoveredAddr := ethcrypto.PubkeyToAddress(*recoveredPubKey)
					log.Printf("  Double hash v=%d: %s", testV, recoveredAddr.Hex())
				}
			}

			v = 0 // Default to v=0, client can test both
		} else {
			log.Printf("Debug: Success with double hash, v=%d", v)
		}
	} else {
		log.Printf("Debug: Success with single hash, v=%d", v)
	}

	// Create 65-byte signature with v value
	sigWithV := make([]byte, 65)
	copy(sigWithV[:64], normalizedSig)
	sigWithV[64] = byte(v)

	// Extract r and s components
	rComponent := hex.EncodeToString(normalizedSig[:32])
	sComponent := hex.EncodeToString(normalizedSig[32:64])

	// Return comprehensive signature information
	response := SignResponse{
		Signature:      hex.EncodeToString(normalizedSig),
		SignatureWithV: hex.EncodeToString(sigWithV),
		V:              v,
		R:              rComponent,
		S:              sComponent,
	}

	// Add warning if v value couldn't be verified
	if err != nil {
		response.Warning = "V value not verified against expected address - signature may need manual verification"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Handler for verifying signatures
func verifySignatureHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	if req.TxHashHex == "" || req.Signature == "" {
		http.Error(w, "txHashHex and signature are required", http.StatusBadRequest)
		return
	}

	// Remove 0x prefix if present
	hashHex := strings.TrimPrefix(req.TxHashHex, "0x")
	sigHex := strings.TrimPrefix(req.Signature, "0x")

	// Decode hex strings
	msgHash, err := hex.DecodeString(hashHex)
	if err != nil {
		http.Error(w, "Invalid txHashHex", http.StatusBadRequest)
		return
	}

	signature, err := hex.DecodeString(sigHex)
	if err != nil {
		http.Error(w, "Invalid signature hex", http.StatusBadRequest)
		return
	}

	if len(msgHash) != 32 {
		http.Error(w, "Transaction hash must be 32 bytes", http.StatusBadRequest)
		return
	}

	response := VerifyResponse{
		ExpectedAddress: globalEthAddress,
		Valid:           false,
	}

	// Handle different signature formats
	if len(signature) == 65 {
		// 65-byte signature (r+s+v)
		recoveredPubKey, err := ethcrypto.SigToPub(msgHash, signature)
		if err != nil {
			response.Message = fmt.Sprintf("Failed to recover public key: %v", err)
		} else {
			recoveredAddr := ethcrypto.PubkeyToAddress(*recoveredPubKey)
			response.RecoveredAddress = recoveredAddr.Hex()
			response.Valid = strings.EqualFold(recoveredAddr.Hex(), globalEthAddress)
			if response.Valid {
				response.Message = "Signature is valid!"
			} else {
				response.Message = "Signature recovers to different address"
			}
		}
	} else if len(signature) == 64 {
		// 64-byte signature (r+s), need to try both v values
		var validRecovery bool
		var recoveredAddr string

		// If v value is provided, use it
		if req.V != nil {
			sigWithV := make([]byte, 65)
			copy(sigWithV[:64], signature)
			sigWithV[64] = byte(*req.V)

			recoveredPubKey, err := ethcrypto.SigToPub(msgHash, sigWithV)
			if err == nil {
				addr := ethcrypto.PubkeyToAddress(*recoveredPubKey)
				recoveredAddr = addr.Hex()
				validRecovery = strings.EqualFold(addr.Hex(), globalEthAddress)
			}
		} else {
			// Try both v values (0 and 1)
			for v := 0; v <= 1; v++ {
				sigWithV := make([]byte, 65)
				copy(sigWithV[:64], signature)
				sigWithV[64] = byte(v)

				recoveredPubKey, err := ethcrypto.SigToPub(msgHash, sigWithV)
				if err == nil {
					addr := ethcrypto.PubkeyToAddress(*recoveredPubKey)
					if strings.EqualFold(addr.Hex(), globalEthAddress) {
						recoveredAddr = addr.Hex()
						validRecovery = true
						break
					}
				}
			}
		}

		response.Valid = validRecovery
		response.RecoveredAddress = recoveredAddr
		if validRecovery {
			response.Message = "Signature is valid!"
		} else {
			response.Message = "Signature verification failed"
		}
	} else {
		response.Message = "Invalid signature length (must be 64 or 65 bytes)"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	flag.Parse()

	// Initialize TPM signer
	log.Println("Initializing TPM...")
	if err := initializeTPM(); err != nil {
		log.Fatalf("Failed to initialize TPM: %v", err)
	}

	// Set up HTTP routes
	http.HandleFunc("/address", getAddressHandler)
	http.HandleFunc("/sign", signTransactionHandler)
	http.HandleFunc("/verify", verifySignatureHandler)
	// Start HTTP server
	serverAddr := ":" + *port
	log.Printf("Starting TPM signing server on http://localhost%s", serverAddr)
	log.Printf("Endpoints:")
	log.Printf("  GET  /address - Returns Ethereum address")
	log.Printf("  POST /sign    - Signs transaction hash")
	log.Printf("  POST /verify  - Verifies signature")
	log.Printf("Using TPM handle: 0x%x", *handle)
	log.Printf("TPM device: %s", *tpmPath)

	if err := http.ListenAndServe(serverAddr, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
