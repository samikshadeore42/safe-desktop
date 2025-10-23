// package main

// import (
// 	"crypto"
// 	"crypto/ecdsa"
// 	"crypto/rand"
// 	"crypto/sha256"
// 	"encoding/base64"
// 	"flag"
// 	"fmt"
// 	"io"
// 	"log"
// 	"math/big"
// 	"net"
// 	"os"
// 	"slices"

// 	"github.com/google/go-tpm/tpm2"
// 	"github.com/google/go-tpm/tpmutil"
// 	"github.com/salrashid123/tpmsigner"
// )

// const ()

// /*


// ## ecc
// 	tpm2_createprimary -C o -G rsa2048:aes128cfb -g sha256 -c primary.ctx -a 'restricted|decrypt|fixedtpm|fixedparent|sensitivedataorigin|userwithauth|noda'
// 	tpm2_create -G ecc:ecdsa  -g sha256  -u key.pub -r key.priv -C primary.ctx  --format=pem --output=ecc_public.pem
// 	tpm2_flushcontext  -t
// 	tpm2_getcap  handles-transient
// 	tpm2_load -C primary.ctx -u key.pub -r key.priv -c key.ctx
// 	tpm2_evictcontrol -C o -c key.ctx 0x81008005
// 	tpm2_flushcontext  -t
// */

// var (
// 	tpmPath = flag.String("tpm-path", "/dev/tpmrm0", "Path to the TPM device (character device or a Unix socket).")
// 	handle  = flag.Uint("handle", 0x81000000, "rsa Handle value")
// )

// var TPMDEVICES = []string{"/dev/tpm0", "/dev/tpmrm0"}

// func OpenTPM(path string) (io.ReadWriteCloser, error) {
// 	if slices.Contains(TPMDEVICES, path) {
// 		return tpmutil.OpenTPM(path)
// 	} else {
// 		return net.Dial("tcp", path)
// 	}
// }

// func main() {

// 	flag.Parse()

// 	rwc, err := OpenTPM(*tpmPath)
// 	if err != nil {
// 		log.Fatalf("can't open TPM %q: %v", *tpmPath, err)
// 	}
// 	defer func() {
// 		if err := rwc.Close(); err != nil {
// 			log.Fatalf("can't close TPM %q: %v", *tpmPath, err)
// 		}
// 	}()

// 	stringToSign := "foo"
// 	fmt.Printf("Data to sign %s\n", stringToSign)

// 	b := []byte(stringToSign)

// 	h := sha256.New()
// 	h.Write(b)
// 	digest := h.Sum(nil)

// 	er, err := tpmsigner.NewTPMCrypto(&tpmsigner.TPM{
// 		TpmDevice:    rwc,
// 		Handle:       tpm2.TPMHandle(*handle),
// 		ECCRawOutput: true, // use raw output; not asn1
// 	})
// 	if err != nil {
// 		fmt.Println(err)
// 		os.Exit(1)
// 	}
// 	es, err := er.Sign(rand.Reader, digest, crypto.SHA256)
// 	if err != nil {
// 		log.Println(err)
// 		os.Exit(1)
// 	}
// 	fmt.Printf("ECC Signed String: %s\n", base64.StdEncoding.EncodeToString(es))

// 	ecPubKey, ok := er.Public().(*ecdsa.PublicKey)
// 	if !ok {
// 		log.Println("EKPublic key not found")
// 		return
// 	}

// 	curveBits := ecPubKey.Curve.Params().BitSize
// 	keyBytes := curveBits / 8
// 	if curveBits%8 > 0 {
// 		keyBytes += 1
// 	}

// 	x := big.NewInt(0).SetBytes(es[:keyBytes])
// 	y := big.NewInt(0).SetBytes(es[keyBytes:])

// 	ok = ecdsa.Verify(ecPubKey, digest[:], x, y)
// 	if !ok {
// 		fmt.Printf("ECDSA Signed String failed\n")
// 		os.Exit(1)
// 	}
// 	fmt.Printf("ECDSA Signed String verified\n")

// 	// now verify with ASN1 output format for ecc using library managed device
// 	erasn, err := tpmsigner.NewTPMCrypto(&tpmsigner.TPM{
// 		TpmDevice: rwc,
// 		Handle:    tpm2.TPMHandle(*handle),
// 		//ECCRawOutput: false,
// 	})
// 	if err != nil {
// 		fmt.Println(err)
// 		os.Exit(1)
// 	}
// 	esasn, err := erasn.Sign(rand.Reader, digest, crypto.SHA256)
// 	if err != nil {
// 		log.Println(err)
// 		os.Exit(1)
// 	}
// 	fmt.Printf("ECC Signed String ASN1: %s\n", base64.StdEncoding.EncodeToString(esasn))

// 	ecPubKeyASN, ok := erasn.Public().(*ecdsa.PublicKey)
// 	if !ok {
// 		log.Println("EKPublic key not found")
// 		return
// 	}

// 	ok = ecdsa.VerifyASN1(ecPubKeyASN, digest[:], esasn)
// 	if !ok {
// 		fmt.Printf("ECDSA Signed String failed\n")
// 		os.Exit(1)
// 	}
// 	fmt.Printf("ECDSA Signed String verified\n")

// }
package main

import (
	"bytes"
	"crypto"
	"crypto/ecdsa"
	"encoding/hex" // We'll use hex instead of base64
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"slices"

	// --- ADDED ETHEREUM LIBRARIES ---
	"github.com/ethereum/go-ethereum/common"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	// ------------------------------------

	"github.com/google/go-tpm/tpm2"
	"github.com/google/go-tpm/tpmutil"
	"github.com/salrashid123/tpmsigner"
)

var (
	tpmPath = flag.String("tpm-path", "/dev/tpmrm0", "Path to the TPM device (character device or a Unix socket).")
	handle  = flag.Uint("handle", 0x81008001, "ecc Handle value") // Use your ECC handle
)

var TPMDEVICES = []string{"/dev/tpm0", "/dev/tpmrm0"}

func OpenTPM(path string) (io.ReadWriteCloser, error) {
	if slices.Contains(TPMDEVICES, path) {
		return tpmutil.OpenTPM(path)
	} else {
		return net.Dial("tcp", path)
	}
}

func main() {
	flag.Parse()

	rwc, err := OpenTPM(*tpmPath)
	if err != nil {
		log.Fatalf("can't open TPM %q: %v", *tpmPath, err)
	}
	defer func() {
		if err := rwc.Close(); err != nil {
			log.Fatalf("can't close TPM %q: %v", *tpmPath, err)
		}
	}()

	// 1. Initialize the TPM Signer
	log.Println("Connecting to TPM and loading key handle...")
	tpmSigner, err := tpmsigner.NewTPMCrypto(&tpmsigner.TPM{
		TpmDevice:    rwc,
		Handle:       tpm2.TPMHandle(*handle),
		ECCRawOutput: true, // CRITICAL: Must be true for Ethereum
	})
	if err != nil {
		log.Fatalf("Failed to initialize TPM signer: %v", err)
	}

	// -----------------------------------------------------------------
	// PART 1: GET YOUR PUBLIC KEY AND ETHEREUM ADDRESS
	// You only do this once, or when your app needs to know its address.
	// -----------------------------------------------------------------

	// Get the standard Go ecdsa.PublicKey from the signer
	pubKey, ok := tpmSigner.Public().(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("Could not get public key from TPM signer")
	}

	// Convert it to a go-ethereum compatible public key
	ethPubKey := ethcrypto.FromECDSAPub(pubKey)
	if err != nil {
		log.Fatalf("Failed to convert to Ethereum public key: %v", err)
	}

	// Derive your Ethereum address from the public key
	ethAddress := ethcrypto.PubkeyToAddress(*pubKey)

	log.Printf("Successfully loaded key from TPM.")
	log.Printf("  Public Key (Hex): %s", hex.EncodeToString(ethPubKey))
	log.Printf("  Ethereum Address: %s", ethAddress.Hex())

	// -----------------------------------------------------------------
	// PART 2: TAKE IN TRANSACTION DETAILS (AS A HASH)
	// -----------------------------------------------------------------

	// In your real server, this hash will come from your frontend (e.g., in an HTTP request).
	// Your frontend (using ethers.js/viem) is responsible for creating the transaction
	// and calculating this Keccak-256 hash.
	// We'll simulate a real 32-byte hash here.
	txHashHex := "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8"
	txHashBytes, err := hex.DecodeString(common.TrimLeftHex(txHashHex))
	if err != nil {
		log.Fatalf("Failed to decode tx hash: %v", err)
	}

	log.Printf("\nSigning transaction hash: %s", txHashHex)

	// -----------------------------------------------------------------
	// PART 3: SIGN THE HASH AND OUTPUT THE ETHEREUM SIGNATURE
	// -----------------------------------------------------------------

	// Sign the 32-byte hash.
	// NOTE: We pass crypto.SHA256, but the input (txHashBytes) is *already* a hash.
	// This is a quirk of the crypto.Signer interface. The TPM will sign
	// the raw 32 bytes you pass it, which is what we want.
	rawSignature, err := tpmSigner.Sign(nil, txHashBytes, crypto.SHA256)
	if err != nil {
		log.Fatalf("TPM signing failed: %v", err)
	}

	if len(rawSignature) != 64 {
		log.Fatalf("Invalid signature length from TPM: got %d, want 64", len(rawSignature))
	}
	log.Println("TPM returned 64-byte [r][s] signature.")

	// --- This is the "Recovery ID" (v) calculation ---
	// The TPM gives us `r` and `s`. We must find `v` (0 or 1).
	
	// Create the 65-byte [r][s][v] signature slice
	finalSignature := make([]byte, 65)
	copy(finalSignature, rawSignature) // Copy [r] (32 bytes) and [s] (32 bytes)

	// We test for `v` = 0 and `v` = 1 to find the correct recovery ID
	// We need the *uncompressed* public key bytes for this check
	expectedPubkeyBytes := ethcrypto.FromECDSAPub(pubKey)

	// Try v = 0
	finalSignature[64] = 0
	recoveredKey, err := ethcrypto.Ecrecover(txHashBytes, finalSignature)
	if err != nil || !bytes.Equal(recoveredKey, expectedPubkeyBytes) {
		// If it failed, try v = 1
		finalSignature[64] = 1
		recoveredKey, err = ethcrypto.Ecrecover(txHashBytes, finalSignature)
		if err != nil || !bytes.Equal(recoveredKey, expectedPubkeyBytes) {
			// This should not happen if the key is correct
			log.Fatalf("Failed to calculate recovery ID. Signature or key is invalid.")
		}
	}

	log.Println("Successfully calculated recovery ID (v).")

	// You now have the final 65-byte signature!
	fmt.Println("\n--- 🚀 FINAL ETHEREUM SIGNATURE 🚀 ---")
	fmt.Printf("0x%s\n", hex.EncodeToString(finalSignature))

	// We can remove the old verification and the ASN.1 section,
	// as they were just for the original example.
}