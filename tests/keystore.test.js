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
});
