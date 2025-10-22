// usage: RPC_URL="..." EXECUTOR_PK="0x..." node scripts/sendExec.js ./exec.json
import fs from 'fs';
import { ethers } from 'ethers';
import 'dotenv/config';

const RPC = process.env.RPC_URL;
const EXECUTOR_PK = process.env.EXECUTOR_PK;

if (process.argv.length < 3) {
  console.error('Usage: node scripts/sendExec.js ./exec.json');
  process.exit(1);
}
const path = process.argv[2];
const payload = JSON.parse(fs.readFileSync(path));
const provider = new ethers.providers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(EXECUTOR_PK, provider);

async function main() {
  const { to, data } = payload;
  console.log('Sending exec tx to safe', to);
  const estimate = await provider.estimateGas({ to, data });
  const gasLimit = estimate.mul(120).div(100);
  const tx = await wallet.sendTransaction({ to, data, gasLimit });
  console.log('txHash:', tx.hash);
  const receipt = await tx.wait();
  console.log('receipt status:', receipt.status);
}
main().catch(console.error);
