// tpm_unseal_sign_server.go
package main

import (
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"

	ethcrypto "github.com/ethereum/go-ethereum/crypto"
)

var (
	port      = flag.String("port", "8080", "HTTP server port")
	tpmHandle = flag.String("tpm-handle", "0x81010002", "TPM persistent handle or context file to unseal from (e.g., 0x81010002 or sealed.ctx)")
	cacheKey  = flag.Bool("cache", true, "Cache the unsealed private key in memory (true) or unseal on each sign request (false)")
)

// globals protected by mutex
var (
	globalPrivKey    *ecdsa.PrivateKey
	globalPrivKeyMut sync.RWMutex
	globalAddress    string
)

func main() {
	flag.Parse()

	log.Printf("TPM unseal/sign server starting on :%s", *port)
	log.Printf("TPM handle/context: %s", *tpmHandle)
	log.Printf("Cache private key: %v", *cacheKey)

	// Unseal once at startup to derive the address (and optionally keep key cached)
	privBytes, err := unsealPrivateKey(*tpmHandle)
	if err != nil {
		log.Fatalf("Failed to unseal at startup: %v", err)
	}
	// Ensure the unsealed bytes are cleaned up appropriately if not caching.
	if len(privBytes) != 32 {
		zeroBytes(privBytes)
		log.Fatalf("Unsealed private key length must be 32 bytes (raw secp256k1). got=%d", len(privBytes))
	}

	// Derive address
	privKey, err := ethcrypto.ToECDSA(privBytes)
	if err != nil {
		zeroBytes(privBytes)
		log.Fatalf("Failed to parse unsealed private key: %v", err)
	}
	addr := ethcrypto.PubkeyToAddress(privKey.PublicKey).Hex()
	globalAddress = addr
	log.Printf("Derived Ethereum address: %s", globalAddress)

	// If caching requested, keep the private key in memory.
	if *cacheKey {
		globalPrivKeyMut.Lock()
		globalPrivKey = privKey
		globalPrivKeyMut.Unlock()
		// Don't zero privBytes here because privKey uses them internally; but we must be careful later to zero on shutdown if needed.
	} else {
		// Not caching: zero out the private key material in memory from startup unseal.
		zeroPrivateKey(privKey)
		globalPrivKey = nil
		zeroBytes(privBytes)
	}

	// HTTP handlers
	httpAddr := ":" + *port
	httpMux := http.NewServeMux()
	httpMux.HandleFunc("/address", getAddressHandler)
	httpMux.HandleFunc("/sign", signHandler)

	log.Printf("Listening on %s", httpAddr)
	if err := http.ListenAndServe(httpAddr, httpMux); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

// ---- HTTP Handlers ----

func getAddressHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		httpError(w, "method not allowed", 405)
		return
	}
	resp := map[string]string{
		"address": globalAddress,
	}
	writeJSON(w, resp)
}

type signRequest struct {
	TxHashHex string `json:"txHashHex"` // expects 32-byte digest (hex)
}

type signResponse struct {
	Signature      string `json:"signature"`      // 64-byte hex (r||s)
	SignatureWithV string `json:"signatureWithV"` // 65-byte hex (r||s||v) where v is 0/1
	V              int    `json:"v"`              // 0 or 1
	LegacyV        int    `json:"legacyV"`        // 27 or 28
	R              string `json:"r"`
	S              string `json:"s"`
	Address        string `json:"address"`
}

func signHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		httpError(w, "method not allowed", 405)
		return
	}

	var req signRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid json body", 400)
		return
	}
	if strings.TrimSpace(req.TxHashHex) == "" {
		httpError(w, "txHashHex required", 400)
		return
	}
	hashHex := strings.TrimPrefix(req.TxHashHex, "0x")
	msgHash, err := hex.DecodeString(hashHex)
	if err != nil || len(msgHash) != 32 {
		httpError(w, "txHashHex must be 32-byte hex (digest)", 400)
		return
	}

	// Acquire private key (either cached or unseal on demand)
	var priv *ecdsa.PrivateKey
	if *cacheKey {
		globalPrivKeyMut.RLock()
		priv = globalPrivKey
		globalPrivKeyMut.RUnlock()
		if priv == nil {
			httpError(w, "private key not available", 500)
			return
		}
		// Use cached priv directly (do NOT zero it here)
		sigResp, err := signWithPriv(msgHash, priv)
		if err != nil {
			httpError(w, fmt.Sprintf("sign error: %v", err), 500)
			return
		}
		writeJSON(w, sigResp)
		return
	}

	// not caching -> unseal per-request and zero immediately after signing
	privBytes, err := unsealPrivateKey(*tpmHandle)
	if err != nil {
		httpError(w, fmt.Sprintf("unseal error: %v", err), 500)
		return
	}
	if len(privBytes) != 32 {
		zeroBytes(privBytes)
		httpError(w, "unsealed private key not 32 bytes", 500)
		return
	}
	priv, err = ethcrypto.ToECDSA(privBytes)
	// zero raw bytes asap
	zeroBytes(privBytes)
	if err != nil {
		httpError(w, fmt.Sprintf("invalid private key format: %v", err), 500)
		return
	}

	// sign and then zero private key fields
	sigResp, err := signWithPriv(msgHash, priv)
	zeroPrivateKey(priv)
	if err != nil {
		httpError(w, fmt.Sprintf("sign error: %v", err), 500)
		return
	}
	writeJSON(w, sigResp)
}

// ---- signing helpers ----

func signWithPriv(msgHash []byte, priv *ecdsa.PrivateKey) (*signResponse, error) {
	// ethcrypto.Sign expects the EXACT 32-byte digest that was signed.
	// Caller MUST provide Keccak256(RLP(...)) for Ethereum txs when required.
	sig65, err := ethcrypto.Sign(msgHash, priv)
	if err != nil {
		return nil, err
	}
	if len(sig65) != 65 {
		return nil, fmt.Errorf("unexpected signature length: %d", len(sig65))
	}
	rb := sig65[:32]
	sb := sig65[32:64]
	vb := sig65[64] // 0 or 1

	sig64hex := hex.EncodeToString(append(rb, sb...))
	sig65hex := hex.EncodeToString(sig65)
	v := int(vb)
	legacyV := 27 + v

	resp := &signResponse{
		Signature:      sig64hex,
		SignatureWithV: sig65hex,
		V:              v,
		LegacyV:        legacyV,
		R:              hex.EncodeToString(rb),
		S:              hex.EncodeToString(sb),
		Address:        globalAddress,
	}
	return resp, nil
}

// ---- TPM unseal helper ----
// tries `tpm2_unseal -c <handle> -o -` (stdout). If that fails, falls back to -o <tmpfile>.
func unsealPrivateKey(handleOrCtx string) ([]byte, error) {
	// try stdout first
	cmd := exec.Command("tpm2_unseal", "-c", handleOrCtx, "-o", "-")
	out, err := cmd.Output()
	if err == nil && len(out) > 0 {
		return out, nil
	}
	// fallback: write to temp file
	tmp, err := os.CreateTemp("", "tpm-unseal-*")
	if err != nil {
		return nil, fmt.Errorf("create temp: %w (prev err: %v)", err, err)
	}
	tmpName := tmp.Name()
	tmp.Close()
	defer os.Remove(tmpName)

	cmd2 := exec.Command("tpm2_unseal", "-c", handleOrCtx, "-o", tmpName)
	if out2, err2 := cmd2.CombinedOutput(); err2 != nil {
		return nil, fmt.Errorf("tpm2_unseal failed (stdout try err=%v) fallback err=%v output=%s", err, err2, string(out2))
	}
	data, err := os.ReadFile(tmpName)
	if err != nil {
		return nil, fmt.Errorf("read unsealed temp file: %w", err)
	}
	return data, nil
}

// ---- utilities ----

func zeroBytes(b []byte) {
	if b == nil {
		return
	}
	for i := range b {
		b[i] = 0
	}
}

func zeroPrivateKey(priv *ecdsa.PrivateKey) {
	if priv == nil {
		return
	}
	// best-effort: zero D (big.Int) bytes, then replace with zeroed value
	if priv.D != nil {
		byteLen := (priv.D.BitLen() + 7) / 8
		tmp := make([]byte, byteLen)
		priv.D.FillBytes(tmp)
		for i := range tmp {
			tmp[i] = 0
		}
		priv.D = new(big.Int) // lose original value
	}
	// zero X,Y coordinates if present
	if priv.PublicKey.X != nil {
		priv.PublicKey.X = new(big.Int)
	}
	if priv.PublicKey.Y != nil {
		priv.PublicKey.Y = new(big.Int)
	}
}

func httpError(w http.ResponseWriter, msg string, code int) {
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
