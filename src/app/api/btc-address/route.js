// src/app/api/btc-address/route.js
import { NextResponse } from "next/server";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";

// Initialize ECC library
bitcoin.initEccLib(ecc);

// Initialize bip32 and ECPair
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

export async function POST(req) {
  try {
    const { mnemonic, derivationPath, addressType } = await req.json();

    console.log("Received request:", { mnemonic, derivationPath, addressType });

    if (!bip39.validateMnemonic(mnemonic)) {
      console.error("Invalid mnemonic");
      return NextResponse.json(
        { error: "Invalid mnemonic phrase" },
        { status: 400 }
      );
    }

    const seed = await bip39.mnemonicToSeed(mnemonic);
    console.log("Seed (hex):", seed.toString("hex"));
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin); // Use mainnet
    const child = root.derivePath(derivationPath);
    console.log("Derivation Path:", derivationPath);

    // Convert the derived public key to a Buffer if needed
    const childPubKey = Buffer.isBuffer(child.publicKey)
      ? child.publicKey
      : Buffer.from(child.publicKey);

    console.log("Public Key (hex):", childPubKey.toString("hex"));
    if (child.privateKey) {
      const childPrivKey = Buffer.isBuffer(child.privateKey)
        ? child.privateKey
        : Buffer.from(child.privateKey);
      console.log("Private Key (hex):", childPrivKey.toString("hex"));
    }

    let payment;
    let paymentData = { network: bitcoin.networks.bitcoin }; // Use mainnet

    switch (addressType) {
      case "LEGACY": {
        const legacyKeyPair = ECPair.fromPublicKey(childPubKey, {
          network: bitcoin.networks.bitcoin,
        });
        payment = bitcoin.payments.p2pkh({
          pubkey: Buffer.from(legacyKeyPair.publicKey),
          network: bitcoin.networks.bitcoin,
        });
        break;
      }
      case "NESTED_SEGWIT": {
        const nestedKeyPair = ECPair.fromPublicKey(childPubKey, {
          network: bitcoin.networks.bitcoin,
        });
        const p2wpkhPayment = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(nestedKeyPair.publicKey),
          network: bitcoin.networks.bitcoin,
        });
        payment = bitcoin.payments.p2sh({
          redeem: p2wpkhPayment,
          network: bitcoin.networks.bitcoin,
        });
        break;
      }
      case "NATIVE_SEGWIT": {
        const nativeKeyPair = ECPair.fromPublicKey(childPubKey, {
          network: bitcoin.networks.bitcoin,
        });
        payment = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(nativeKeyPair.publicKey),
          network: bitcoin.networks.bitcoin,
        });
        break;
      }
      case "TAPROOT": {
        if (!child.privateKey) {
          console.error("Private Key Missing for Taproot");
          return NextResponse.json(
            { error: "Private key required for Taproot address generation" },
            { status: 400 }
          );
        }
        // Ensure the private key is a Buffer
        const childPrivKey = Buffer.isBuffer(child.privateKey)
          ? child.privateKey
          : Buffer.from(child.privateKey);
        // Use the raw key (no manual tweak) and extract the x-only pubkey (remove first byte)
        paymentData.internalPubkey = childPubKey.slice(1);
        payment = bitcoin.payments.p2tr(paymentData);
        break;
      }
      default:
        console.error("Invalid address type:", addressType);
        return NextResponse.json(
          { error: "Invalid address type" },
          { status: 400 }
        );
    }

    console.log("Generated Address:", payment?.address);

    if (!payment || !payment.address) {
      console.error("Address generation failed");
      return NextResponse.json(
        { error: "Failed to generate address" },
        { status: 500 }
      );
    }

    return NextResponse.json({ address: payment.address });
  } catch (error) {
    console.error("Error in /api/btc-address:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
