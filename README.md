# Keystore Maker

Keystore Maker is a standalone desktop tool for Android signing keystores. It can generate keystore files, inspect existing keystores, and display certificate fingerprints and public key formats commonly needed for app stores and备案/registration systems.

中文：Keystore Maker 是一个用于 Android 签名证书的桌面工具，可生成 keystore，读取证书签名信息，并展示备案或应用市场常用的证书指纹与公钥格式。

## Features

- Generate JKS files as `.jks` or `.keystore`.
- Generate PKCS12 files as `.p12` or `.pfx`.
- Inspect JKS, `.keystore`, PKCS12, P12, and PFX files.
- Show certificate MD5, SHA1, and SHA256 fingerprints.
- Show public key in multiple formats:
  - RSA modulus decimal
  - RSA modulus hex
  - Full public key DER hex
  - Public key PEM
- Copy each value with one click.
- Switch UI language between Chinese and English.
- Packaged apps do not require Java, JDK, Android Studio, keytool, or Node.js.

## Public Key Formats

Some platforms show the public key as a long decimal number. That value is usually the RSA modulus converted to decimal.

Keystore Maker also shows the complete X.509 SubjectPublicKeyInfo DER hex value, which includes the RSA algorithm identifier, modulus, and exponent. These two values can look different while representing the same public key.

## Run Locally

```sh
npm install
npm start
```

## Test

```sh
npm test
```

## Build

Build an unpacked app for the current platform:

```sh
npm run pack
```

Build macOS artifacts:

```sh
npm run dist:mac
```

Build Windows x64 artifacts:

```sh
npm run dist:win
```

Windows packaging is best run on Windows or in CI. Cross-building Windows installers on macOS may require downloading Electron Builder helper binaries.

## Release Artifacts

Expected macOS artifacts:

- `dist/Keystore Maker-<version>-arm64.dmg`
- `dist/Keystore Maker-<version>-arm64-mac.zip`

Expected Windows artifacts:

- `dist/Keystore Maker Setup <version>.exe`
- `dist/Keystore Maker <version>.exe` or portable equivalent, depending on Electron Builder output.

## macOS Security Notice

The default local build is not notarized by Apple. On first launch, macOS may require:

```text
Finder -> Control-click app -> Open
```

For public releases, notarization requires an Apple Developer account and signing/notarization credentials.

## Tech Stack

- Electron
- Node.js crypto APIs
- node-forge
- electron-builder

## License

MIT
