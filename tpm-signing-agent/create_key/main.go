// gen_and_seal.go
package main

import (
	"encoding/hex"
	"fmt"
	"os"

	ethcrypto "github.com/ethereum/go-ethereum/crypto"
)

func main() {
	priv, err := ethcrypto.GenerateKey()
	if err != nil {
		panic(err)
	}
	privBytes := ethcrypto.FromECDSA(priv) // 32 bytes

	// write raw 32-byte private key to file (binary)
	if err := os.WriteFile("secp256k1.priv", privBytes, 0600); err != nil {
		panic(err)
	}
	fmt.Printf("Wrote %d bytes to secp256k1.priv (hex): %s\n", len(privBytes), hex.EncodeToString(privBytes))
}
