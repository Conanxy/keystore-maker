# Keystore Maker

Keystore Maker is a macOS and Windows desktop app for creating Android keystores and reading certificate signatures/fingerprints from JKS, `.keystore`, PKCS12, P12, and PFX files.

Runtime note: packaged apps do not require users to install Node.js, Java, JDK, Android Studio, or keytool. The app writes JKS files directly in JavaScript and uses Electron's bundled runtime.

## Features

- Generate JKS files with `.jks` or `.keystore` suffixes.
- Generate PKCS12 files with `.p12` or `.pfx` suffixes.
- Read signature, MD5, SHA1, and SHA256 fingerprints.
- Switch between Chinese and English.

## Development

```sh
npm install
npm start
```

## Test

```sh
npm test
```

## Build Installers

```sh
npm run dist:mac
npm run dist:win
```

Windows packaging is best run on Windows or on CI configured for Windows builds.

## License

MIT
