const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  decodeModifiedUtf8,
  generateAndroidKeystore,
  inspectKeystore,
  modifiedUtf8Encode
} = require("../src/keystore");

function modulusDecimalFromSpkiHex(publicKeyHex) {
  const match = publicKeyHex.match(/0282010100([0-9A-F]{512})0203010001/);
  assert.ok(match, "RSA modulus should be present in SPKI public key");
  return BigInt(`0x${match[1]}`).toString();
}

test("modified UTF-8 round trips common aliases", () => {
  const aliases = ["release", "安卓发布", "alias-01"];
  for (const alias of aliases) {
    assert.equal(decodeModifiedUtf8(modifiedUtf8Encode(alias)), alias);
  }
});

test("generates and inspects a JKS keystore", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "keystore-maker-"));
  const outputPath = path.join(tempDir, "release.jks");
  const generated = await generateAndroidKeystore({
    outputPath,
    alias: "release",
    storePassword: "changeit",
    keyPassword: "keypass1",
    commonName: "Android Release",
    organization: "Acme",
    orgUnit: "Mobile",
    locality: "Shanghai",
    state: "Shanghai",
    country: "CN",
    validityDays: "365",
    keySize: "2048"
  });

  const inspected = await inspectKeystore({ filePath: outputPath, password: "changeit", alias: "release" });
  assert.equal(generated.alias, "release");
  assert.equal(inspected.storeType, "JKS");
  assert.equal(inspected.entries.length, 1);
  assert.equal(inspected.entries[0].signatureSha1, generated.signatureSha1);
  assert.equal(inspected.entries[0].publicKeySha256, generated.publicKeySha256);
  assert.equal(inspected.entries[0].publicKeyModulus, modulusDecimalFromSpkiHex(inspected.entries[0].publicKey));
  assert.equal(inspected.entries[0].publicKeyExponent, "AQAB");
  assert.match(inspected.entries[0].publicKeyPem, /^-----BEGIN PUBLIC KEY-----/);
  assert.match(inspected.entries[0].signature, /^[0-9A-F]+$/);
});

test("generates a .keystore file as JKS", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "keystore-maker-"));
  const outputPath = path.join(tempDir, "release.keystore");
  const generated = await generateAndroidKeystore({
    keystoreType: "jks",
    outputPath,
    alias: "release",
    storePassword: "changeit",
    keyPassword: "keypass1",
    commonName: "Android Release"
  });

  const inspected = await inspectKeystore({ filePath: outputPath, password: "changeit" });
  assert.equal(generated.storeType, "JKS");
  assert.equal(inspected.storeType, "JKS");
  assert.equal(inspected.entries[0].signatureSha256, generated.signatureSha256);
});

test("defaults certificate validity to 36500 days", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "keystore-maker-"));
  const outputPath = path.join(tempDir, "default-validity.jks");
  const generated = await generateAndroidKeystore({
    outputPath,
    alias: "release",
    storePassword: "changeit",
    keyPassword: "keypass1",
    commonName: "Android Release"
  });
  const validFrom = Date.parse(generated.validFrom);
  const validTo = Date.parse(generated.validTo);
  const days = Math.round((validTo - validFrom) / (24 * 60 * 60 * 1000));
  assert.equal(days, 36500);
});

test("caps certificate validity to 36500 days", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "keystore-maker-"));
  const outputPath = path.join(tempDir, "max-validity.jks");
  const generated = await generateAndroidKeystore({
    outputPath,
    alias: "release",
    storePassword: "changeit",
    keyPassword: "keypass1",
    commonName: "Android Release",
    validityDays: "999999"
  });
  assert.equal(generated.validityDays, 36500);
});

test("generates and inspects a PKCS12 keystore", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "keystore-maker-"));
  const outputPath = path.join(tempDir, "release.p12");
  const generated = await generateAndroidKeystore({
    keystoreType: "pkcs12",
    outputPath,
    alias: "release",
    storePassword: "changeit",
    keyPassword: "keypass1",
    commonName: "Android Release"
  });

  const inspected = await inspectKeystore({ filePath: outputPath, password: "keypass1", alias: "release" });
  assert.equal(generated.storeType, "PKCS12");
  assert.equal(inspected.storeType, "PKCS12");
  assert.equal(inspected.entries[0].signatureSha1, generated.signatureSha1);
  assert.equal(inspected.entries[0].publicKeySha1, generated.publicKeySha1);
  assert.match(inspected.entries[0].publicKey, /^[0-9A-F]+$/);
});
