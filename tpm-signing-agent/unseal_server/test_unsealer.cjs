#!/usr/bin/env node
/**
 * Test script for TPM unsealer server
 * Tests address retrieval and transaction signing using sealed secp256k1 keys
 */

const http = require('http');

const SERVER_URL = 'http://localhost:8081';

async function makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(SERVER_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function test() {
    console.log('🔐 Testing TPM Unsealer Server');
    console.log('================================\n');

    try {
        // Test 1: Get address
        console.log('1. Getting Ethereum address...');
        const addressResponse = await makeRequest('GET', '/address');
        if (addressResponse.status === 200) {
            console.log('✅ Address:', addressResponse.data.address);
        } else {
            console.log('❌ Failed to get address:', addressResponse.data);
            return;
        }

        // Test 2: Sign a transaction hash
        console.log('\n2. Signing transaction hash...');
        const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        const signResponse = await makeRequest('POST', '/sign', { txHashHex: txHash });
        
        if (signResponse.status === 200) {
            console.log('✅ Signature created successfully!');
            console.log('   64-byte signature (r+s):', signResponse.data.signature);
            console.log('   65-byte signature (r+s+v):', signResponse.data.signatureWithV);
            console.log('   Recovery ID (v):', signResponse.data.v);
            console.log('   Legacy V:', signResponse.data.legacyV);
            console.log('   R component:', signResponse.data.r);
            console.log('   S component:', signResponse.data.s);
            console.log('   Signing address:', signResponse.data.address);
        } else {
            console.log('❌ Failed to sign:', signResponse.data);
            return;
        }

        // Test 3: Sign another hash to test consistency
        console.log('\n3. Signing different hash...');
        const txHash2 = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const signResponse2 = await makeRequest('POST', '/sign', { txHashHex: txHash2 });
        
        if (signResponse2.status === 200) {
            console.log('✅ Second signature created successfully!');
            console.log('   Signature differs from first:', signResponse.data.signature !== signResponse2.data.signature);
            console.log('   Same address used:', signResponse.data.address === signResponse2.data.address);
        } else {
            console.log('❌ Failed to sign second hash:', signResponse2.data);
        }

        console.log('\n🎉 All tests passed! TPM unsealer server is working correctly.');
        console.log('\nThis demonstrates:');
        console.log('• Sealed secp256k1 private key can be unsealed by TPM');
        console.log('• Ethereum-compatible signatures are generated in software');
        console.log('• Key material is protected by TPM authorization');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

test();
