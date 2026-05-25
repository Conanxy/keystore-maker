const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const forge = require("node-forge");

const JKS_MAGIC = 0xfeedfeed;
const JKS_VERSION = 2;
const PRIVATE_KEY_ENTRY = 1;
const TRUSTED_CERT_ENTRY = 2;
const JKS_KEY_PROTECTOR_OID = "1.3.6.1.4.1.42.2.17.1.1";
const JKS_WHITENER = Buffer.from("Mighty Aphrodite", "utf8");
const KEYSTORE_TYPES = {
  jks: { storeType: "JKS", extensions: [".jks", ".keystore"] },
  pkcs12: { storeType: "PKCS12", extensions: [".p12", ".pfx"] }
};

function assertText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label}不能为空`);
  }
  return value.trim();
}

function assertPassword(value, label) {
  if (typeof value !== "string" || value.length < 6) {
    throw new Error(`${label}至少需要6位`);
  }
  return value;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function toBinaryString(buffer) {
  return Buffer.from(buffer).toString("binary");
}

function fromBinaryString(value) {
  return Buffer.from(value, "binary");
}

function javaPasswordBytes(password) {
  const bytes = Buffer.alloc(password.length * 2);
  for (let index = 0; index < password.length; index += 1) {
    bytes.writeUInt16BE(password.charCodeAt(index), index * 2);
  }
  return bytes;
}

function sha1(...buffers) {
  return crypto.createHash("sha1").update(Buffer.concat(buffers)).digest();
}

function modifiedUtf8Encode(value) {
  const bytes = [];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0x0001 && code <= 0x007f) {
      bytes.push(code);
    } else if (code <= 0x07ff) {
      bytes.push(0xc0 | ((code >> 6) & 0x1f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xe0 | ((code >> 12) & 0x0f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return Buffer.from(bytes);
}

function decodeModifiedUtf8(buffer) {
  const codes = [];
  for (let index = 0; index < buffer.length; ) {
    const byte = buffer[index];
    if ((byte & 0x80) === 0) {
      codes.push(byte);
      index += 1;
    } else if ((byte & 0xe0) === 0xc0) {
      codes.push(((byte & 0x1f) << 6) | (buffer[index + 1] & 0x3f));
      index += 2;
    } else {
      codes.push(
        ((byte & 0x0f) << 12) |
          ((buffer[index + 1] & 0x3f) << 6) |
          (buffer[index + 2] & 0x3f)
      );
      index += 3;
    }
  }
  return String.fromCharCode(...codes);
}

class BinaryWriter {
  constructor() {
    this.chunks = [];
  }

  writeInt(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(value);
    this.chunks.push(buffer);
  }

  writeLong(value) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(value));
    this.chunks.push(buffer);
  }

  writeUtf(value) {
    const encoded = modifiedUtf8Encode(value);
    if (encoded.length > 65535) {
      throw new Error("文本过长，无法写入JKS");
    }
    const length = Buffer.alloc(2);
    length.writeUInt16BE(encoded.length);
    this.chunks.push(length, encoded);
  }

  writeBytes(buffer) {
    this.chunks.push(Buffer.from(buffer));
  }

  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  ensure(size) {
    if (this.offset + size > this.buffer.length) {
      throw new Error("keystore文件结构不完整");
    }
  }

  readInt() {
    this.ensure(4);
    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  readLong() {
    this.ensure(8);
    const value = this.buffer.readBigInt64BE(this.offset);
    this.offset += 8;
    return value;
  }

  readUtf() {
    this.ensure(2);
    const length = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    this.ensure(length);
    const value = decodeModifiedUtf8(this.buffer.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  readBytes(length) {
    this.ensure(length);
    const value = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
}

function createCertificate(options) {
  const keySize = clampInt(options.keySize, 2048, 2048, 4096);
  const { privateKey: privateKeyPem, publicKey: publicKeyPem } = crypto.generateKeyPairSync("rsa", {
    modulusLength: keySize,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const cert = forge.pki.createCertificate();
  const now = new Date();
  const validityDays = clampInt(options.validityDays, 10000, 1, 36500);
  const notAfter = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  cert.publicKey = publicKey;
  cert.serialNumber = crypto.randomBytes(16).toString("hex").replace(/^00/, "01");
  cert.validity.notBefore = now;
  cert.validity.notAfter = notAfter;

  const attrs = [
    { name: "commonName", value: assertText(options.commonName || options.alias, "证书名称") },
    { name: "organizationalUnitName", value: options.orgUnit || "Android" },
    { name: "organizationName", value: options.organization || "Unknown" },
    { name: "localityName", value: options.locality || "Unknown" },
    { name: "stateOrProvinceName", value: options.state || "Unknown" },
    { name: "countryName", value: (options.country || "CN").slice(0, 2).toUpperCase() }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
    { name: "subjectKeyIdentifier" }
  ]);
  cert.sign(privateKey, forge.md.sha256.create());

  const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(privateKey));
  const pkcs8Der = fromBinaryString(forge.asn1.toDer(pkcs8Asn1).getBytes());
  const certDer = fromBinaryString(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());

  return { privateKey, cert, pkcs8Der, certDer };
}

function protectPrivateKey(pkcs8Der, password) {
  const passwordBytes = javaPasswordBytes(password);
  let roundSeed = crypto.randomBytes(20);
  const initialSeed = Buffer.from(roundSeed);
  const encrypted = Buffer.alloc(pkcs8Der.length);
  let offset = 0;

  while (offset < pkcs8Der.length) {
    roundSeed = sha1(passwordBytes, roundSeed);
    const length = Math.min(roundSeed.length, pkcs8Der.length - offset);
    for (let index = 0; index < length; index += 1) {
      encrypted[offset + index] = pkcs8Der[offset + index] ^ roundSeed[index];
    }
    offset += length;
  }

  const checksum = sha1(passwordBytes, pkcs8Der);
  const protectedKey = Buffer.concat([initialSeed, encrypted, checksum]);
  const encryptedPrivateKeyInfo = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer(JKS_KEY_PROTECTOR_OID).getBytes()
      )
    ]),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, toBinaryString(protectedKey))
  ]);

  return fromBinaryString(forge.asn1.toDer(encryptedPrivateKeyInfo).getBytes());
}

function buildJks({ alias, storePassword, keyPassword, certDer, pkcs8Der }) {
  const writer = new BinaryWriter();
  writer.writeInt(JKS_MAGIC);
  writer.writeInt(JKS_VERSION);
  writer.writeInt(1);
  writer.writeInt(PRIVATE_KEY_ENTRY);
  writer.writeUtf(alias);
  writer.writeLong(Date.now());

  const protectedKey = protectPrivateKey(pkcs8Der, keyPassword);
  writer.writeInt(protectedKey.length);
  writer.writeBytes(protectedKey);

  writer.writeInt(1);
  writer.writeUtf("X.509");
  writer.writeInt(certDer.length);
  writer.writeBytes(certDer);

  const body = writer.toBuffer();
  const digest = sha1(javaPasswordBytes(storePassword), JKS_WHITENER, body);
  return Buffer.concat([body, digest]);
}

function buildPkcs12({ alias, storePassword, keyPassword, cert, privateKey }) {
  const password = keyPassword || storePassword;
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], password, {
    algorithm: "3des",
    friendlyName: alias,
    generateLocalKeyId: true
  });
  return fromBinaryString(forge.asn1.toDer(p12Asn1).getBytes());
}

function certificateInfo(certDer, alias = "") {
  const x509 = new crypto.X509Certificate(certDer);
  const publicKey = x509.publicKey.export({ type: "spki", format: "der" });
  const publicKeyPem = x509.publicKey.export({ type: "spki", format: "pem" });
  const hash = (algorithm) => crypto.createHash(algorithm).update(certDer).digest("hex").toUpperCase();
  const publicKeyHash = (algorithm) => crypto.createHash(algorithm).update(publicKey).digest("hex").toUpperCase();
  const colon = (value) => value.match(/.{1,2}/g).join(":");
  const signature = certDer.toString("hex").toUpperCase();
  return {
    alias,
    subject: x509.subject,
    issuer: x509.issuer,
    serialNumber: x509.serialNumber,
    validFrom: x509.validFrom,
    validTo: x509.validTo,
    signature,
    signatureMd5: colon(hash("md5")),
    signatureSha1: colon(hash("sha1")),
    signatureSha256: colon(hash("sha256")),
    publicKeyAlgorithm: x509.publicKey.asymmetricKeyType?.toUpperCase() || "UNKNOWN",
    publicKey: publicKey.toString("hex").toUpperCase(),
    publicKeyPem,
    publicKeyMd5: colon(publicKeyHash("md5")),
    publicKeySha1: colon(publicKeyHash("sha1")),
    publicKeySha256: colon(publicKeyHash("sha256")),
    compact: {
      md5: hash("md5"),
      sha1: hash("sha1"),
      sha256: hash("sha256"),
      publicKeyMd5: publicKeyHash("md5"),
      publicKeySha1: publicKeyHash("sha1"),
      publicKeySha256: publicKeyHash("sha256")
    },
    pem: x509.toString()
  };
}

async function generateAndroidKeystore(options) {
  const alias = assertText(options.alias, "别名");
  const storePassword = assertPassword(options.storePassword, "Keystore密码");
  const keyPassword = assertPassword(options.keyPassword || options.storePassword, "Key密码");
  const outputPath = assertText(options.outputPath, "保存路径");
  const keystoreType = options.keystoreType === "pkcs12" ? "pkcs12" : "jks";
  const selectedType = KEYSTORE_TYPES[keystoreType];
  const extension = path.extname(outputPath).toLowerCase();
  if (extension && !selectedType.extensions.includes(extension)) {
    throw new Error(`当前类型请使用${selectedType.extensions.join("或")}后缀`);
  }

  const { privateKey, cert, certDer, pkcs8Der } = createCertificate({ ...options, alias });
  const keystore =
    keystoreType === "pkcs12"
      ? buildPkcs12({ alias, storePassword, keyPassword, cert, privateKey })
      : buildJks({ alias, storePassword, keyPassword, certDer, pkcs8Der });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, keystore);

  return {
    outputPath,
    storeType: selectedType.storeType,
    keyAlgorithm: "RSA",
    signatureAlgorithm: "SHA256withRSA",
    ...certificateInfo(certDer, alias)
  };
}

function parseJks(buffer, password) {
  if (buffer.length < 32) throw new Error("JKS文件过短");
  const body = buffer.subarray(0, buffer.length - 20);
  const expectedDigest = buffer.subarray(buffer.length - 20);
  const actualDigest = sha1(javaPasswordBytes(password), JKS_WHITENER, body);
  if (!crypto.timingSafeEqual(expectedDigest, actualDigest)) {
    throw new Error("Keystore密码错误或JKS文件已损坏");
  }

  const reader = new BinaryReader(body);
  const magic = reader.readInt();
  if (magic !== JKS_MAGIC) throw new Error("不是有效的JKS文件");
  const version = reader.readInt();
  if (version !== 1 && version !== 2) throw new Error(`不支持的JKS版本：${version}`);
  const count = reader.readInt();
  const certs = [];

  for (let entryIndex = 0; entryIndex < count; entryIndex += 1) {
    const tag = reader.readInt();
    const alias = reader.readUtf();
    reader.readLong();

    if (tag === PRIVATE_KEY_ENTRY) {
      const keyLength = reader.readInt();
      reader.readBytes(keyLength);
      const chainLength = reader.readInt();
      for (let certIndex = 0; certIndex < chainLength; certIndex += 1) {
        if (version === 2) reader.readUtf();
        const certLength = reader.readInt();
        certs.push({ alias, certDer: Buffer.from(reader.readBytes(certLength)) });
      }
    } else if (tag === TRUSTED_CERT_ENTRY) {
      if (version === 2) reader.readUtf();
      const certLength = reader.readInt();
      certs.push({ alias, certDer: Buffer.from(reader.readBytes(certLength)) });
    } else {
      throw new Error(`不支持的JKS条目类型：${tag}`);
    }
  }

  if (certs.length === 0) throw new Error("keystore内没有证书");
  return certs.map((entry) => certificateInfo(entry.certDer, entry.alias));
}

function parsePkcs12(buffer, password) {
  try {
    const asn1 = forge.asn1.fromDer(toBinaryString(buffer));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (bags.length === 0) throw new Error("PKCS12内没有证书");
    return bags.map((bag, index) => {
      const certDer = fromBinaryString(forge.asn1.toDer(forge.pki.certificateToAsn1(bag.cert)).getBytes());
      const alias = bag.attributes?.friendlyName?.[0] || `certificate-${index + 1}`;
      return certificateInfo(certDer, alias);
    });
  } catch (error) {
    throw new Error(`PKCS12读取失败：${error.message}`);
  }
}

async function inspectKeystore(options) {
  const filePath = assertText(options.filePath, "keystore路径");
  const password = assertPassword(options.password, "Keystore密码");
  const buffer = await fs.readFile(filePath);
  const magic = buffer.length >= 4 ? buffer.readUInt32BE(0) : 0;
  const entries = magic === JKS_MAGIC ? parseJks(buffer, password) : parsePkcs12(buffer, password);
  const alias = options.alias?.trim();
  const filtered = alias ? entries.filter((entry) => entry.alias === alias) : entries;
  if (filtered.length === 0) throw new Error(`没有找到别名：${alias}`);
  return {
    filePath,
    storeType: magic === JKS_MAGIC ? "JKS" : "PKCS12",
    entries: filtered
  };
}

module.exports = {
  generateAndroidKeystore,
  inspectKeystore,
  parseJks,
  parsePkcs12,
  certificateInfo,
  modifiedUtf8Encode,
  decodeModifiedUtf8,
  javaPasswordBytes,
  protectPrivateKey
};
