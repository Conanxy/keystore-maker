# Keystore Maker

[English](README.md)

Keystore Maker 是一个用于 Android 签名证书的桌面工具。它可以生成 keystore 文件，读取已有 keystore，并展示应用市场、备案系统常用的证书指纹和公钥格式。

打包后的应用不要求用户安装 Java、JDK、Android Studio、keytool 或 Node.js。

## 功能

- 生成 JKS 文件，支持 `.jks` 和 `.keystore` 后缀。
- 生成 PKCS12 文件，支持 `.p12` 和 `.pfx` 后缀。
- 读取 JKS、`.keystore`、PKCS12、P12、PFX 文件。
- 展示证书 MD5、SHA1、SHA256 指纹。
- 展示多种公钥格式：
  - RSA modulus 十进制
  - RSA modulus Hex
  - 完整公钥 DER Hex
  - 公钥 PEM
- 每个结果都可以一键复制。
- 界面支持中文和英文切换。

## 公钥格式说明

有些平台会把公钥显示成一串很长的十进制数字，这通常是 RSA 公钥的 modulus 转成十进制后的结果。

Keystore Maker 也会展示完整的 X.509 SubjectPublicKeyInfo DER Hex。它包含 RSA 算法标识、modulus 和 exponent，所以看起来会和十进制 modulus 不一样，但可以代表同一把公钥。

## 本地运行

```sh
npm install
npm start
```

## 测试

```sh
npm test
```

## 构建

生成当前平台的未打包 app 目录：

```sh
npm run pack
```

生成 macOS 安装包：

```sh
npm run dist:mac
```

生成 Windows x64 安装包：

```sh
npm run dist:win
```

Windows 安装包建议在 Windows 或 CI 环境里构建。在 macOS 上交叉构建 Windows 安装包时，Electron Builder 可能需要下载额外的辅助工具。

## Release 产物

macOS 预期产物：

- `dist/Keystore Maker-<version>-arm64.dmg`
- `dist/Keystore Maker-<version>-arm64-mac.zip`

Windows 预期产物：

- `dist/Keystore Maker Setup <version>.exe`
- `dist/Keystore Maker <version>.exe` 或 Electron Builder 输出的 portable 文件。

## macOS 安全提示

默认本地构建没有经过 Apple notarization。首次打开时，macOS 可能需要：

```text
Finder -> 按住 Control 点击应用 -> 打开
```

如果要发布给更多用户下载，正式 notarization 需要 Apple Developer 账号和签名/公证配置。

## 技术栈

- Electron
- Node.js crypto APIs
- node-forge
- electron-builder

## License

MIT
