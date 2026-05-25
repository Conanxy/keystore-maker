# Publish 0.0.1

## Build

```sh
npm install
npm test
npm run dist:mac
npm run dist:win
```

## GitHub

```sh
git remote add origin git@github.com:<owner>/keystore-maker.git
git push -u origin main
git push origin v0.0.1
```

Create a GitHub Release from tag `v0.0.1`, paste `RELEASE_NOTES.md`, and upload artifacts from `dist/`.

Current macOS artifacts:

- `dist/Keystore Maker-0.0.1-arm64.dmg`
- `dist/Keystore Maker-0.0.1-arm64-mac.zip`

Windows x64 artifacts are produced by `npm run dist:win`.
