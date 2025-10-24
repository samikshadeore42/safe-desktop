#!/bin/bash

# TPM Signing Agent - Simple Deployment Script
# This script can be packaged with Electron apps for easy TPM setup

# Set script directory as working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔐 TPM Signing Agent for Safe Desktop"
echo "====================================="
echo

# Check if this is first run
if [ ! -f ".tpm-config" ] && [ ! -f "./tpm-signing-server" ]; then
    echo "🚀 First time setup - this will:"
    echo "   1. Install TPM tools (requires admin password)"
    echo "   2. Build server binaries"
    echo "   3. Generate and seal crypto keys to TPM"
    echo "   4. Start the signing server"
    echo
    read -p "Continue with setup? [Y/n]: " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Run full setup
    ./setup-and-run.sh
    
else
    echo "⚡ Quick start - TPM is already configured"
    echo
    
    # Just start the server
    ./setup-and-run.sh --start
fi

echo
echo "🎉 TPM Signing Agent is now running!"
echo "    Your Electron app can now make requests to:"
echo "    • http://localhost:8081/address"
echo "    • http://localhost:8081/sign"
echo
echo "📖 To stop the server: ./setup-and-run.sh --stop"
echo "📖 To check status:    ./setup-and-run.sh --status"
echo
