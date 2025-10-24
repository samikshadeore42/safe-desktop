#!/bin/bash

# Test script for TPM signing server

SERVER_URL="http://localhost:8081"  # Updated to use port 8081

echo "=== Testing TPM Signing Server ==="
echo

# Test 1: Get Ethereum address
echo "1. Getting Ethereum address..."
ADDRESS_RESPONSE=$(curl -s -X GET "$SERVER_URL/address")
echo "$ADDRESS_RESPONSE" | jq .
ADDRESS=$(echo "$ADDRESS_RESPONSE" | jq -r .address)
echo

# Test 2: Sign a transaction hash
echo "2. Signing a transaction hash..."
TX_HASH="0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164"

SIGN_RESPONSE=$(curl -s -X POST "$SERVER_URL/sign" \
  -H "Content-Type: application/json" \
  -d "{\"txHashHex\": \"$TX_HASH\"}")

echo "$SIGN_RESPONSE" | jq .

# Extract signature components (handle potential null values)
SIGNATURE_64=$(echo "$SIGN_RESPONSE" | jq -r '.signature // empty')
SIGNATURE_65=$(echo "$SIGN_RESPONSE" | jq -r '.signatureWithV // empty')
V_VALUE=$(echo "$SIGN_RESPONSE" | jq -r '.v // 0')
R_VALUE=$(echo "$SIGN_RESPONSE" | jq -r '.r // empty')
S_VALUE=$(echo "$SIGN_RESPONSE" | jq -r '.s // empty')
WARNING=$(echo "$SIGN_RESPONSE" | jq -r '.warning // empty')

echo
echo "Extracted signature components:"
echo "  64-byte signature (r+s): $SIGNATURE_64"
echo "  65-byte signature (r+s+v): $SIGNATURE_65"
echo "  V value: $V_VALUE"
echo "  R component: $R_VALUE"
echo "  S component: $S_VALUE"
if [ -n "$WARNING" ]; then
    echo "  ⚠️  Warning: $WARNING"
fi
echo

# Only continue with verification tests if we have valid signatures
if [ -n "$SIGNATURE_64" ] && [ "$SIGNATURE_64" != "null" ]; then
    # Test 3: Verify the 65-byte signature
    if [ -n "$SIGNATURE_65" ] && [ "$SIGNATURE_65" != "null" ]; then
        echo "3. Verifying 65-byte signature..."
        curl -s -X POST "$SERVER_URL/verify" \
          -H "Content-Type: application/json" \
          -d "{\"txHashHex\": \"$TX_HASH\", \"signature\": \"$SIGNATURE_65\"}" | jq .
        echo
    fi

    # Test 4: Verify the 64-byte signature with explicit v value
    echo "4. Verifying 64-byte signature with explicit v value..."
    curl -s -X POST "$SERVER_URL/verify" \
      -H "Content-Type: application/json" \
      -d "{\"txHashHex\": \"$TX_HASH\", \"signature\": \"$SIGNATURE_64\", \"v\": $V_VALUE}" | jq .
    echo

    # Test 5: Verify the 64-byte signature without v value (auto-detect)
    echo "5. Verifying 64-byte signature with auto-detection..."
    curl -s -X POST "$SERVER_URL/verify" \
      -H "Content-Type: application/json" \
      -d "{\"txHashHex\": \"$TX_HASH\", \"signature\": \"$SIGNATURE_64\"}" | jq .
    echo

    # Test 6: Manual verification with both v values
    echo "6. Manual verification testing both v values..."
    for test_v in 0 1; do
        echo "  Testing v=$test_v:"
        curl -s -X POST "$SERVER_URL/verify" \
          -H "Content-Type: application/json" \
          -d "{\"txHashHex\": \"$TX_HASH\", \"signature\": \"$SIGNATURE_64\", \"v\": $test_v}" | jq '.valid, .recoveredAddress, .message'
    done
    echo
else
    echo "❌ No valid signature received - skipping verification tests"
    echo
fi

# Test 7: Test with wrong signature (should fail)
echo "7. Testing with invalid signature (should fail)..."
WRONG_SIG="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
curl -s -X POST "$SERVER_URL/verify" \
  -H "Content-Type: application/json" \
  -d "{\"txHashHex\": \"$TX_HASH\", \"signature\": \"$WRONG_SIG\"}" | jq .
echo

echo "=== Test completed ==="
