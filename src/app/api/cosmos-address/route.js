// src/app/api/cosmos-address/route.js
import { NextResponse } from "next/server";
import * as bip39 from "bip39";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";
import CryptoJS from "crypto-js";
import { bech32 } from "bech32";

// Initialize bip32 with tiny-secp256k1
const bip32 = BIP32Factory(ecc);

export async function POST(req) {
  try {
    const { mnemonic, derivationPath } = await req.json();

    // Validate mnemonic phrase
    if (!bip39.validateMnemonic(mnemonic)) {
      return NextResponse.json(
        { error: "Invalid mnemonic phrase" },
        { status: 400 }
      );
    }

    // Convert mnemonic to seed (Buffer)
    const seed = await bip39.mnemonicToSeed(mnemonic);
    // Derive root and child node using the provided derivation path
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);

    // 1. Get the public key as a Buffer
    const pubKeyBuffer = Buffer.from(child.publicKey);
    // 2. Convert the Buffer into a CryptoJS word array
    const wordArray = CryptoJS.lib.WordArray.create(pubKeyBuffer);
    // 3. Compute SHA256 hash
    const sha256Hash = CryptoJS.SHA256(wordArray);
    // 4. Compute RIPEMD160 hash on the SHA256 result
    const ripemd160Hash = CryptoJS.RIPEMD160(sha256Hash);
    // 5. Convert to a hex string
    const ripemd160Hex = ripemd160Hash.toString(CryptoJS.enc.Hex);
    // 6. Convert the hex string back to a Buffer, then to bech32 words
    const words = bech32.toWords(Buffer.from(ripemd160Hex, "hex"));
    // 7. Encode using bech32 with "cosmos" as the human-readable part
    const cosmosAddress = bech32.encode("cosmos", words);

    return NextResponse.json({ address: cosmosAddress });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
