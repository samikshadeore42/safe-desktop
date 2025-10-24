/**
 * Example of how to verify TPM signatures using ethers.js
 * This demonstrates integration with the TPM signing server
 */

const { ethers } = require('ethers');

// Example usage with the TPM signing server
async function verifyTPMSignature() {
    // 1. Get the signature from your TPM server
    const txHash = "0xce092d40e81b6994594db49f209ac5b980049c24a4bef5f775318d4e12497164";
    
    // This would come from your server's /sign endpoint
    const serverResponse = {
        signature: "abc123...",      // 64-byte signature (r+s)
        signatureWithV: "abc123...", // 65-byte signature (r+s+v)
        v: 0,                       // Recovery ID
        r: "abc123...",             // r component
        s: "def456..."              // s component
    };

    // 2. Verify using the 65-byte signature (easiest)
    try {
        const recoveredAddress = ethers.utils.recoverAddress(txHash, "0x" + serverResponse.signatureWithV);
        console.log("Recovered address:", recoveredAddress);
        
        // Compare with expected address from /address endpoint
        const expectedAddress = "0x1234567890abcdef1234567890abcdef12345678"; // From /address endpoint
        const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        console.log("Signature valid:", isValid);
        
    } catch (error) {
        console.error("Verification failed:", error);
    }

    // 3. Alternative: Verify using 64-byte signature + v value manually
    try {
        // Reconstruct the 65-byte signature
        const signature = serverResponse.signature + serverResponse.v.toString(16).padStart(2, '0');
        const recoveredAddress2 = ethers.utils.recoverAddress(txHash, "0x" + signature);
        console.log("Alternative verification result:", recoveredAddress2);
        
    } catch (error) {
        console.error("Alternative verification failed:", error);
    }
}

// Example for Safe SDK integration
function formatForSafeSDK(serverResponse) {
    // Safe SDK typically expects just the 64-byte signature
    return "0x" + serverResponse.signature;
}

// Example for custom dApp integration
function formatForDApp(serverResponse) {
    // Custom dApps might want the full 65-byte signature
    return "0x" + serverResponse.signatureWithV;
}

// Example for Metamask-style verification
function formatForMetamask(serverResponse) {
    // Convert v to legacy format (27/28) if needed
    const v = serverResponse.v + 27;
    return "0x" + serverResponse.r + serverResponse.s + v.toString(16).padStart(2, '0');
}

// Export functions for use in other modules
module.exports = {
    verifyTPMSignature,
    formatForSafeSDK,
    formatForDApp,
    formatForMetamask
};

// If running this file directly, run the example
if (require.main === module) {
    verifyTPMSignature().catch(console.error);
}
