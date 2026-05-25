# Publish Releases

## Automated Release

Releases are built by GitHub Actions when a `v*` tag is pushed.

For a new patch release:

```sh
npm version patch
git push origin main
git push origin --tags
```

GitHub Actions will:

- build macOS `.dmg` and `.zip` artifacts on `macos-latest`
- build Windows `.exe` artifacts on `windows-latest`
- create/update the GitHub Release for the pushed tag
- upload the generated installers to the Release

## Re-run 0.0.1

If `v0.0.1` already exists and you need to rebuild it after workflow changes:

```sh
git tag -f v0.0.1
git push origin v0.0.1 --force
```

## Manual Local Build

```sh
npm install
npm test
npm run dist:mac
npm run dist:win
```

Upload files from `dist/` to the GitHub Release manually if needed.
