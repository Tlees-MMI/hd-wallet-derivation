"use client";
import React, { useState } from "react";
import { ethers, Mnemonic } from "ethers";
import * as bip39 from "bip39";
import * as bip32 from "bip32";
import { payments } from "bitcoinjs-lib";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { AptosAccount } from "aptos";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import CryptoJS from "crypto-js";
import { bech32 } from "bech32";

const IndexPage = () => {
  const [mnemonic, setMnemonic] = useState("");
  const [chain, setChain] = useState("ETH");
  const [customPath, setCustomPath] = useState("m/44'/60'/0'/0/0");
  const [accountIndex, setAccountIndex] = useState(0);
  const [addressIndex, setAddressIndex] = useState(0);
  const [addressResult, setAddressResult] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [btcType, setBtcType] = useState("LEGACY"); // Default to Legacy
  const [derivedWalletAddresses, setDerivedWalletAddresses] = useState({
    MetaMask: "",
    Phantom: "",
    OKX: "",
    "Coinbase Wallet": "",
  });
  const [derivedWalletAddressesRow2, setDerivedWalletAddressesRow2] = useState({
    // NEW STATE FOR ROW 4
    MetaMask: "",
    Phantom: "",
    OKX: "",
    "Coinbase Wallet": "",
  });

  const deriveAddressForChain = async (
    mnemonicPhrase,
    targetChain,
    derivationPathInput,
    btcAddressType
  ) => {
    let currentDerivationPath = "";
    let currentChain = targetChain;
    let currentBtcType = btcAddressType;

    if (currentChain === "CUSTOM") {
      currentDerivationPath = derivationPathInput.trim();
      if (!currentDerivationPath) {
        throw new Error("Please enter a valid custom derivation path.");
      }
    } else if (currentChain === "ETH") {
      currentDerivationPath = derivationPathInput || `m/44'/60'/0'/0/0`;
    } else if (currentChain === "BTC") {
      switch (currentBtcType) {
        case "LEGACY":
          currentDerivationPath = derivationPathInput || `m/44'/0'/0'/0/0`;
          break;
        case "NESTED_SEGWIT":
          currentDerivationPath = derivationPathInput || `m/49'/0'/0'/0/0`;
          break;
        case "NATIVE_SEGWIT":
          currentDerivationPath = derivationPathInput || `m/84'/0'/0'/0/0`;
          break;
        case "TAPROOT":
          currentDerivationPath = derivationPathInput || `m/86'/0'/0'/0/0`;
          break;
        default:
          throw new Error("Invalid BTC address type");
      }
    } else if (currentChain === "SOL") {
      currentDerivationPath = derivationPathInput || `m/44'/501'/0'/0'`;
    } else if (currentChain === "APTOS") {
      currentDerivationPath = derivationPathInput || `m/44'/637'/0'/0'/0'`;
    } else if (currentChain === "SUI") {
      currentDerivationPath = derivationPathInput || `m/44'/784'/0'/0'/0'`;
    } else if (currentChain === "COSMOS") {
      currentDerivationPath = derivationPathInput || `m/44'/118'/0'/0/0`;
    } else {
      throw new Error("Unsupported chain selected for derivation.");
    }

    const mnemonicSeed = Mnemonic.fromPhrase(mnemonicPhrase.trim()); // Create Mnemonic object

    if (currentChain === "ETH") {
      const wallet = ethers.HDNodeWallet.fromMnemonic(
        mnemonicSeed, // Use Mnemonic object
        currentDerivationPath
      );
      return wallet.address;
    } else if (currentChain === "BTC") {
      const response = await fetch("/api/btc-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mnemonic: mnemonicPhrase.trim(),
          derivationPath: currentDerivationPath,
          addressType: currentBtcType,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate BTC address");
      }
      const data = await response.json();
      return data.address;
    } else if (currentChain === "SOL") {
      const seed = await bip39.mnemonicToSeed(mnemonicPhrase.trim());
      const seedHex = seed.toString("hex");
      const derivedSeed = derivePath(currentDerivationPath, seedHex).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      return keypair.publicKey.toBase58();
    } else if (currentChain === "APTOS") {
      const seed = await bip39.mnemonicToSeed(mnemonicPhrase.trim());
      const { key } = derivePath(currentDerivationPath, seed.toString("hex"));
      const account = new AptosAccount(key);
      return account.address().toString(); // Ensure it's a string
    } else if (currentChain === "SUI") {
      const seed = await bip39.mnemonicToSeed(mnemonicPhrase.trim());
      const { key } = derivePath(currentDerivationPath, seed.toString("hex"));
      const keypair = Ed25519Keypair.fromSecretKey(key);
      return keypair.getPublicKey().toSuiAddress();
    } else if (currentChain === "COSMOS") {
      const response = await fetch("/api/cosmos-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mnemonicPhrase: mnemonicPhrase.trim(), // Corrected here - Ensure mnemonicPhrase is used
          derivationPath: currentDerivationPath,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate Cosmos address");
      }
      const data = await response.json();
      return data.address;
    }
    return "Address Derivation Not Supported";
  };

  const deriveAddressesForWallets = async () => {
    setErrorMessage("");
    setDerivedWalletAddresses({
      MetaMask: "",
      Phantom: "",
      OKX: "",
      "Coinbase Wallet": "",
    });

    if (!bip39.validateMnemonic(mnemonic.trim())) {
      setErrorMessage("Invalid mnemonic phrase");
      return;
    }

    const walletDefinitions = {
      MetaMask: {
        supportedNetworks: ["ETH"],
        derivationPath: `m/44'/60'/0'/0/0`,
        incrementType: { ETH: "address" },
      },
      Phantom: {
        supportedNetworks: ["ETH", "SOL", "SUI", "BTC"],
        derivationPath: {
          ETH: `m/44'/60'/0'/0/0`,
          SOL: `m/44'/501'/0'/0'`,
          SUI: `m/44'/784'/0'/0'/0'`, // Corrected SUI derivation path - removed extra /0'
          BTC: `m/84'/0'/0'/0/0`,
        },
        incrementType: {
          ETH: "address",
          SOL: "account",
          SUI: "account",
          BTC: "address",
        },
      },
      OKX: {
        supportedNetworks: ["ETH", "SOL", "SUI", "BTC"],
        derivationPath: {
          ETH: `m/44'/60'/0'/0/0`,
          SOL: `m/44'/501'/0'/0'`,
          SUI: `m/44'/784'/0'/0'/0'`, // Corrected SUI derivation path - removed extra /0'
          BTC: `m/84'/0'/0'/0/0`,
        },
        incrementType: {
          ETH: "address",
          SOL: "account",
          SUI: "account",
          BTC: "address",
        },
      },
      "Coinbase Wallet": {
        supportedNetworks: ["ETH", "SOL", "BTC"],
        derivationPath: {
          ETH: `m/44'/60'/0'/0/0`,
          SOL: `m/44'/501'/0'/0'`,
          BTC: `m/84'/0'/0'/0/0`,
        },
        incrementType: { ETH: "address", SOL: "account", BTC: "address" },
      },
    };

    const derivedAddresses = {};
    for (const walletName in walletDefinitions) {
      const walletDef = walletDefinitions[walletName];
      let addressString = "";
      for (const network of walletDef.supportedNetworks) {
        try {
          let currentDerivationPath = "";
          let btcTypeForWallet = "LEGACY"; // Default BTC type

          if (typeof walletDef.derivationPath === "string") {
            currentDerivationPath = walletDef.derivationPath;
          } else if (
            typeof walletDef.derivationPath === "object" &&
            walletDef.derivationPath[network]
          ) {
            currentDerivationPath = walletDef.derivationPath[network];
            if (network === "BTC") {
              btcTypeForWallet = "NATIVE_SEGWIT"; // Consistent BTC type for wallets supporting multiple chains like Phantom/OKX/Coinbase
            }
          }

          const address = await deriveAddressForChain(
            mnemonic, // Use the mnemonic state directly
            network,
            currentDerivationPath,
            btcTypeForWallet // Pass BTC type here
          );
          addressString += `${currentDerivationPath} | ${network} | ${address}<br />`;
        } catch (error) {
          addressString += `Error (${network}): ${error.message}<br />`;
        }
      }
      derivedAddresses[walletName] = addressString;
    }
    setDerivedWalletAddresses(derivedAddresses);
  };

  const deriveNextAddressesForWallets = async () => {
    // NEW FUNCTION FOR ROW 4
    setErrorMessage("");
    setDerivedWalletAddressesRow2({
      MetaMask: "",
      Phantom: "",
      OKX: "",
      "Coinbase Wallet": "",
    });

    if (!bip39.validateMnemonic(mnemonic.trim())) {
      setErrorMessage("Invalid mnemonic phrase");
      return;
    }

    const walletDefinitions = {
      // Re-using the same walletDefinitions for increment info
      MetaMask: {
        supportedNetworks: ["ETH"],
        derivationPath: `m/44'/60'/0'/0/0`,
        incrementType: { ETH: "address" },
      },
      Phantom: {
        supportedNetworks: ["ETH", "SOL", "SUI", "BTC"],
        derivationPath: {
          ETH: `m/44'/60'/0'/0/0`,
          SOL: `m/44'/501'/0'/0'`,
          SUI: `m/44'/784'/0'/0'/0'`, // Corrected SUI derivation path - removed extra /0'
          BTC: `m/84'/0'/0'/0/0`,
        },
        incrementType: {
          ETH: "address",
          SOL: "account",
          SUI: "account",
          BTC: "address",
        },
      },
      OKX: {
        supportedNetworks: ["ETH", "SOL", "SUI", "BTC"],
        derivationPath: {
          ETH: `m/44'/60'/0'/0/0`,
          SOL: `m/44'/501'/0'/0'`,
          SUI: `m/44'/784'/0'/0'/0'`, // Corrected SUI derivation path - removed extra /0'
          BTC: `m/84'/0'/0'/0/0`,
        },
        incrementType: {
          ETH: "address",
          SOL: "account",
          SUI: "account",
          BTC: "address",
        },
      },
      "Coinbase Wallet": {
        supportedNetworks: ["ETH", "SOL", "BTC"],
        derivationPath: {
          ETH: `m/44'/60'/0'/0/0`,
          SOL: `m/44'/501'/0'/0'`,
          BTC: `m/84'/0'/0'/0/0`,
        },
        incrementType: { ETH: "address", SOL: "account", BTC: "address" },
      },
    };

    const derivedAddressesRow2 = {};
    for (const walletName in walletDefinitions) {
      const walletDef = walletDefinitions[walletName];
      let addressString = "";
      for (const network of walletDef.supportedNetworks) {
        let currentDerivationPath = "";
        let btcTypeForWallet = "LEGACY";
        let nextAccountIndex = accountIndex;
        let nextAddressIndex = addressIndex;

        try {
          if (typeof walletDef.derivationPath === "string") {
            currentDerivationPath = walletDef.derivationPath;
          } else if (
            typeof walletDef.derivationPath === "object" &&
            walletDef.derivationPath[network]
          ) {
            currentDerivationPath = walletDef.derivationPath[network];
            if (network === "BTC") {
              btcTypeForWallet = "NATIVE_SEGWIT";
            }
          }

          const incrementType = walletDef.incrementType[network];

          let nextDerivationPath = ""; // Initialize here

          if (network === "ETH") {
            nextDerivationPath = `m/44'/60'/${accountIndex}'/0/${
              addressIndex + 1
            }`; // Increment addressIndex for ETH
          } else if (network === "SOL") {
            nextDerivationPath = `m/44'/501'/${
              accountIndex + 1
            }'/${addressIndex}'`; // Increment accountIndex for SOL
          } else if (network === "SUI") {
            nextDerivationPath = `m/44'/784'/${accountIndex + 1}'/0'/0'`; // Increment accountIndex for SUI and corrected path
          } else if (network === "BTC") {
            switch (btcTypeForWallet) {
              case "LEGACY":
                nextDerivationPath = `m/44'/0'/${accountIndex}'/0/${
                  addressIndex + 1
                }`; // Increment addressIndex for BTC
                break;
              case "NESTED_SEGWIT":
                nextDerivationPath = `m/49'/0'/${accountIndex}'/0/${
                  addressIndex + 1
                }`; // Increment addressIndex for BTC
                break;
              case "NATIVE_SEGWIT":
                nextDerivationPath = `m/84'/0'/${accountIndex}'/0/${
                  addressIndex + 1
                }`; // Increment addressIndex for BTC
                break;
              case "TAPROOT":
                nextDerivationPath = `m/86'/0'/${accountIndex}'/0/${
                  addressIndex + 1
                }`; // Increment addressIndex for BTC
                break;
            }
          }

          const address = await deriveAddressForChain(
            mnemonic,
            network,
            nextDerivationPath,
            btcTypeForWallet
          );
          addressString += `${nextDerivationPath} | ${network} | ${address}<br />`;
        } catch (error) {
          addressString += `Error (${network}): ${error.message}<br />`;
        }
      }
      derivedAddressesRow2[walletName] = addressString;
    }
    setDerivedWalletAddressesRow2(derivedAddressesRow2);
  };

  // NEW COMBINED FUNCTION
  const deriveAllAddressesForWallets = async () => {
    await deriveAddressesForWallets(); // Generate row 3 addresses
    await deriveNextAddressesForWallets(); // Generate row 4 addresses
  };

  const generateAddress = async () => {
    setErrorMessage("");
    setAddressResult("");
    try {
      if (!bip39.validateMnemonic(mnemonic.trim())) {
        throw new Error("Invalid mnemonic phrase");
      }

      let derivationPath = "";

      if (chain === "CUSTOM") {
        derivationPath = customPath.trim();
        if (!derivationPath)
          throw new Error("Please enter a valid custom derivation path.");
      } else if (chain === "ETH") {
        derivationPath = `m/44'/60'/${accountIndex}'/0/${addressIndex}`;
      } else if (chain === "BTC") {
        // *** Correct Derivation Paths for Mainnet ***
        switch (btcType) {
          case "LEGACY":
            derivationPath = `m/44'/0'/${accountIndex}'/0/${addressIndex}`;
            break;
          case "NESTED_SEGWIT":
            derivationPath = `m/49'/0'/${accountIndex}'/0/${addressIndex}`;
            break;
          case "NATIVE_SEGWIT":
            derivationPath = `m/84'/0'/${accountIndex}'/0/${addressIndex}`;
            break;
          case "TAPROOT":
            derivationPath = `m/86'/0'/${accountIndex}'/0/${addressIndex}`;
            break;
          default:
            throw new Error("Invalid BTC address type");
        }
      } else if (chain === "SOL") {
        derivationPath = `m/44'/501'/${accountIndex}'/${addressIndex}'`;
      } else if (chain === "APTOS") {
        derivationPath = `m/44'/637'/${accountIndex}'/0'/${addressIndex}'`;
      } else if (chain === "SUI") {
        derivationPath = `m/44'/784'/${accountIndex}'/0'/${addressIndex}'`; // Ensure derivation path is correctly reconstructed
      } else if (chain === "COSMOS") {
        derivationPath = `m/44'/118'/0/${addressIndex}`; // Corrected derivation path for Cosmos - removed account index from default
      } else {
        throw new Error("Unsupported chain selected");
      }

      const mnemonicSeed = Mnemonic.fromPhrase(mnemonic.trim()); // Create Mnemonic object

      if (chain === "ETH") {
        const wallet = ethers.HDNodeWallet.fromMnemonic(
          mnemonicSeed, // Use Mnemonic object
          derivationPath
        );
        setAddressResult(wallet.address);
      } else if (chain === "BTC") {
        const response = await fetch("/api/btc-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mnemonic: mnemonic.trim(),
            derivationPath,
            addressType: btcType,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate BTC address");
        }
        const data = await response.json();
        setAddressResult(data.address);
      } else if (chain === "SOL") {
        const seed = await bip39.mnemonicToSeed(mnemonic.trim());
        const seedHex = seed.toString("hex");
        const derivedSeed = derivePath(derivationPath, seedHex).key;
        const keypair = Keypair.fromSeed(derivedSeed);
        setAddressResult(keypair.publicKey.toBase58());
      } else if (chain === "APTOS") {
        const seed = await bip39.mnemonicToSeed(mnemonic.trim());
        const { key } = derivePath(derivationPath, seed.toString("hex"));
        const account = new AptosAccount(key);
        setAddressResult(account.address());
      } else if (chain === "SUI") {
        derivationPath = `m/44'/784'/${accountIndex}'/0'/${addressIndex}'`; // Ensure derivation path is correctly reconstructed

        const seed = await bip39.mnemonicToSeed(mnemonic.trim());
        const { key } = derivePath(derivationPath, seed.toString("hex"));
        const keypair = Ed25519Keypair.fromSecretKey(key);

        setAddressResult(keypair.getPublicKey().toSuiAddress());
      } else if (chain === "COSMOS") {
        const response = await fetch("/api/cosmos-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mnemonic: mnemonic.trim(), derivationPath }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to generate Cosmos address"
          );
        }
        const data = await response.json();
        setAddressResult(data.address);
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <>
      <div className="container">
        <h1>HD Wallet &amp; Multi-Chain Derivation Path Explorer</h1>

        <label htmlFor="mnemonic">Mnemonic Phrase:</label>
        <textarea
          id="mnemonic"
          rows="4"
          placeholder="Enter your mnemonic phrase (for testing ONLY)"
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          className="border-2 border-grey-300 rounded-md"
        ></textarea>

        <label htmlFor="chainSelect">Select Chain/Coin:</label>
        <select
          id="chainSelect"
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          className="border-2 border-grey-300 rounded-md"
        >
          <option value="ETH">Ethereum (ETH – BIP‑44 m/44/60&apos;/...)</option>
          <option value="BTC">Bitcoin (BTC)</option>
          <option value="SOL">Solana (SOL – m/44&apos;/501&apos;/...)</option>
          <option value="APTOS">
            Aptos (APTOS – m/44&apos;/637&apos;/0&apos;/0&apos;/0&apos;)
          </option>
          <option value="SUI">
            Sui (SUI – m/44&apos;/784&apos;/0&apos;/0&apos;)
          </option>
          <option value="COSMOS">
            Cosmos (COSMOS – m/44&apos;/118&apos;/...)
          </option>
          <option value="CUSTOM">Custom Path (Advanced)</option>
        </select>

        {chain === "BTC" && (
          <>
            <label htmlFor="btcType">Select BTC Address Type:</label>
            <select
              id="btcType"
              value={btcType}
              onChange={(e) => setBtcType(e.target.value)}
              className="border-2 border-grey-300 rounded-md"
            >
              <option value="LEGACY">Legacy (P2PKH)</option>
              <option value="NESTED_SEGWIT">Nested SegWit (P2SH-P2WPKH)</option>
              <option value="NATIVE_SEGWIT">Native SegWit (P2WPKH)</option>
              <option value="TAPROOT">Taproot (P2TR)</option>
            </select>
          </>
        )}

        {chain === "CUSTOM" && (
          <>
            <label htmlFor="derivationPath">Custom Derivation Path:</label>
            <input
              type="text"
              id="derivationPath"
              placeholder="e.g., m/44'/60'/0'/0/0"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
            />
          </>
        )}

        <label htmlFor="accountIndex">Account Index:</label>
        <input
          type="number"
          id="accountIndex"
          value={accountIndex}
          onChange={(e) => setAccountIndex(Number(e.target.value))}
          className="border-2 border-grey-300 rounded-md"
        />

        <label htmlFor="addressIndex">Address Index:</label>
        <input
          type="number"
          id="addressIndex"
          value={addressIndex}
          onChange={(e) => setAddressIndex(Number(e.target.value))}
          className="border-2 border-grey-300 rounded-md"
        />

        <button
          className="border-2 border-grey-300 rounded-md"
          onClick={generateAddress}
        >
          Generate Address
        </button>

        <label htmlFor="addressResult">Derived Address:</label>
        <textarea
          id="addressResult"
          rows="1"
          readOnly
          placeholder="Derived address will appear here"
          value={addressResult}
        ></textarea>

        {errorMessage && <div id="errorMessage">{errorMessage}</div>}
      </div>

      {/* --- Styled Fixed Table with 5 Columns and 4 Rows --- */}
      <div className="table-container">
        <h2>Wallet Details</h2>
        <button
          className="derive-button" // Updated class name for styling
          onClick={deriveAllAddressesForWallets} // Calls combined function
        >
          Derive Wallet Addresses (Rows 3 & 4) {/* Combined button text */}
        </button>

        <table>
          <thead>
            <tr className="header-row">
              {" "}
              {/* Header row class */}
              <th></th>
              <th>MetaMask</th>
              <th>Phantom</th>
              <th>OKX</th>
              <th>Coinbase Wallet</th>
            </tr>
          </thead>
          <tbody>
            <tr className="info-row">
              {" "}
              {/* Info row class */}
              <td>Networks Supported</td>
              <td>ETH</td>
              <td>ETH, SOL, SUI, BTC</td>
              <td>ETH, SOL, SUI, BTC</td>
              <td>ETH, SOL, BTC (partial)</td>
            </tr>
            <tr className="info-row">
              {" "}
              {/* Info row class */}
              <td>Address Increment</td>
              <td>ETH Only – [I] on Address Path</td>
              <td>
                SOL – [Increment] on Account Path
                <br />
                ETH – [Increment] on Address Path
                <br />
                SUI – [Increment] on Account Path
                <br />
                BTC – [Increment] on Address Path
              </td>
              <td>
                SOL – [Increment] on Account Path
                <br />
                ETH – [Increment] on Address Path
                <br />
                SUI – [Increment] on Account Path
                <br />
                BTC – [Increment] on Address Path
              </td>
              <td>
                SOL – [Increment] on Account Path
                <br />
                ETH – [Increment] on Address Path
                <br />
                SUI – N/A - Not Supported
                <br />
                BTC – N/A - Cannot create a “second” account on a wallet and
                receive addresses
              </td>
            </tr>
            {/* Row for Derived Addresses (m/0'/0) */}
            <tr className="address-row">
              {" "}
              {/* Address row class */}
              <td>Derived Addresses (m/0&apos;/0)</td>
              <td className="address-cell">
                {" "}
                {/* Address cell class */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddresses.MetaMask,
                  }}
                />
              </td>
              <td className="address-cell">
                {" "}
                {/* Address cell class */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddresses.Phantom,
                  }}
                />
              </td>
              <td className="address-cell">
                {" "}
                {/* Address cell class */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddresses.OKX,
                  }}
                />
              </td>
              <td className="address-cell">
                {" "}
                {/* Address cell class */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddresses["Coinbase Wallet"],
                  }}
                />
              </td>
            </tr>
            {/* NEW Row for Derived Addresses (m/1'/0) */}
            <tr className="address-row">
              {" "}
              {/* Address row class */}
              <td>Derived Addresses (m/1&apos;/0)</td> {/* Updated row label */}
              <td className="address-cell">
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddressesRow2.MetaMask,
                  }}
                />
              </td>
              <td className="address-cell">
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddressesRow2.Phantom,
                  }}
                />
              </td>
              <td className="address-cell">
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddressesRow2.OKX,
                  }}
                />
              </td>
              <td className="address-cell">
                <div
                  dangerouslySetInnerHTML={{
                    __html: derivedWalletAddressesRow2["Coinbase Wallet"],
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        label {
          display: block;
          margin-top: 10px;
        }
        textarea,
        input,
        select,
        button {
          margin-bottom: 10px;
          width: calc(100% - 10px);
          padding: 8px;
          box-sizing: border-box;
        }
        textarea[readonly] {
          background-color: #f0f0f0;
          cursor: not-allowed;
        }
        #errorMessage {
          color: red;
          margin-top: 10px;
        }
        .table-container {
          max-width: 1000px; /* Wider table container */
          margin: 30px auto;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px; /* Rounded corners */
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow */
        }
        .derive-button {
          /* Style for the combined derive button */
          width: auto;
          padding: 10px 15px;
          margin-bottom: 15px;
          border: 1px solid #0070f3; /* Example primary color */
          color: #0070f3;
          background-color: white;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s, color 0.2s;
        }
        .derive-button:hover {
          background-color: #0070f3;
          color: white;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px; /* Add some space above the table */
        }
        th,
        td {
          border: 1px solid #ddd;
          padding: 12px 8px; /* Increased padding for better spacing */
          text-align: left;
          word-break: break-word; /* Wrap long words */
          font-size: 14px; /* Slightly smaller font for cells */
        }
        th {
          background-color: #f8f8f8; /* Light grey header background */
          font-weight: bold;
          color: #333; /* Darker header text */
        }
        .header-row th {
          background-color: #e0e0e0; /* Slightly darker header for main headers */
        }
        .info-row td {
          background-color: #fdfdfd; /* Very light background for info rows */
          color: #555;
        }
        .address-row td {
          vertical-align: top; /* Align address text to the top of the cell */
        }
        .address-cell {
          font-family: monospace; /* Monospace font for addresses */
          font-size: 12px; /* Even smaller font for addresses */
        }
      `}</style>
    </>
  );
};

export default IndexPage;
