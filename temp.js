import { ethers } from "ethers";

const safeTxHash = "0xc06875cfcc3c7cec6e83f38ca6800ddf9fdc661115c66c4fdfd5de0eccd6ca15";
const sig = "0x108f17260b01cb51c444a000f26878f54aecf3bba7efd655cece5d0554604dee0067c5c14937a1a3f11a5dabce2f60244055d0f57a7295eb9b3c2bd05a49ab7e1b"; // one signature (65 bytes hex)

function toRPCSig(sigHex) {
  // make sure v is 27/28; if libraries returned 0/1 normalize to 27/28
  const { r, s, v } = ethers.utils.splitSignature(sigHex);
  const vNorm = (v === 0 || v === 1) ? v + 27 : v;
  return ethers.utils.joinSignature({ r, s, v: vNorm });
}

const normalized = toRPCSig(sig);
const signer = ethers.utils.recoverAddress(safeTxHash, normalized);
console.log("recovered signer:", signer);
