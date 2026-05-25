const translations = {
  zh: {
    aliasOptionalPlaceholder: "留空读取全部证书",
    aliasLabel: "别名",
    brandSubtitle: "Android JKS 签名工具",
    chooseButton: "选择",
    commonNameLabel: "证书名称 CN",
    copy: "复制",
    copied: "已复制",
    copyAll: "复制全部",
    countryLabel: "国家 C",
    fileTypeLabel: "文件类型",
    generateButton: "生成 {type}",
    generateBusy: "正在生成 RSA 密钥和 {type} 文件...",
    generateDone: "已生成：{path}",
    generateTab: "生成",
    generateTitle: "生成 Android Keystore",
    idleStatus: "等待操作",
    inspectBusy: "正在读取 keystore...",
    inspectButton: "读取签名",
    inspectDone: "已读取 {count} 个证书",
    inspectTab: "读取",
    inspectTitle: "读取签名信息",
    issuerLabel: "Issuer",
    keyPasswordLabel: "Key 密码",
    keySizeLabel: "RSA 位数",
    keystoreFileLabel: "Keystore 文件",
    keystorePasswordLabel: "Keystore 密码",
    localityLabel: "城市 L",
    modeSwitchLabel: "功能切换",
    openPathPlaceholder: "选择 .jks / .keystore / .p12 / .pfx",
    orgUnitLabel: "部门 OU",
    organizationLabel: "组织 O",
    publicKeyAlgorithmLabel: "公钥算法",
    publicKeyLabel: "公钥",
    publicKeyMd5Label: "公钥MD5",
    publicKeyPemLabel: "公钥PEM",
    publicKeySha1Label: "公钥SHA1",
    publicKeySha256Label: "公钥SHA256",
    resultTitle: "签名结果",
    runtimeNote: "打包后不依赖 Java、JDK、Android Studio 或 keytool。",
    savePathLabel: "保存路径",
    savePathPlaceholder: "选择保存位置",
    savePathTypePlaceholder: "选择 {extension} 保存位置",
    serialLabel: "Serial",
    signatureLabel: "签名",
    signatureMd5Label: "签名MD5",
    signatureSha1Label: "签名SHA1",
    signatureSha256Label: "签名SHA256",
    stateLabel: "省份 ST",
    subjectLabel: "Subject",
    validFromLabel: "Valid From",
    validToLabel: "Valid To",
    validityLabel: "有效期(天)"
  },
  en: {
    aliasOptionalPlaceholder: "Leave empty to read all certificates",
    aliasLabel: "Alias",
    brandSubtitle: "Android keystore signing tool",
    chooseButton: "Choose",
    commonNameLabel: "Certificate name CN",
    copy: "Copy",
    copied: "Copied",
    copyAll: "Copy all",
    countryLabel: "Country C",
    fileTypeLabel: "File type",
    generateButton: "Generate {type}",
    generateBusy: "Generating RSA key and {type} file...",
    generateDone: "Generated: {path}",
    generateTab: "Generate",
    generateTitle: "Generate Android Keystore",
    idleStatus: "Waiting",
    inspectBusy: "Reading keystore...",
    inspectButton: "Read signature",
    inspectDone: "Read {count} certificate(s)",
    inspectTab: "Inspect",
    inspectTitle: "Read Signature Info",
    issuerLabel: "Issuer",
    keyPasswordLabel: "Key password",
    keySizeLabel: "RSA bits",
    keystoreFileLabel: "Keystore file",
    keystorePasswordLabel: "Keystore password",
    localityLabel: "Locality L",
    modeSwitchLabel: "Mode switch",
    openPathPlaceholder: "Choose .jks / .keystore / .p12 / .pfx",
    orgUnitLabel: "Organization unit OU",
    organizationLabel: "Organization O",
    publicKeyAlgorithmLabel: "Public key algorithm",
    publicKeyLabel: "Public key",
    publicKeyMd5Label: "Public key MD5",
    publicKeyPemLabel: "Public key PEM",
    publicKeySha1Label: "Public key SHA1",
    publicKeySha256Label: "Public key SHA256",
    resultTitle: "Signature Result",
    runtimeNote: "Packaged app does not require Java, JDK, Android Studio, or keytool.",
    savePathLabel: "Save path",
    savePathPlaceholder: "Choose save location",
    savePathTypePlaceholder: "Choose {extension} save location",
    serialLabel: "Serial",
    signatureLabel: "Signature",
    signatureMd5Label: "Signature MD5",
    signatureSha1Label: "Signature SHA1",
    signatureSha256Label: "Signature SHA256",
    stateLabel: "State ST",
    subjectLabel: "Subject",
    validFromLabel: "Valid from",
    validToLabel: "Valid to",
    validityLabel: "Validity (days)"
  }
};

const state = {
  lastText: "",
  lang: localStorage.getItem("lang") || (navigator.language.startsWith("zh") ? "zh" : "en")
};

const panels = {
  generate: document.querySelector("#generate-panel"),
  inspect: document.querySelector("#inspect-panel")
};

const statusNode = document.querySelector("#status");
const resultsNode = document.querySelector("#results");
const generateButton = document.querySelector("#generate-button");
const inspectButton = document.querySelector("#inspect-button");
const keystoreTypeSelect = document.querySelector("#keystoreType");
const outputPathInput = document.querySelector("#outputPath");

const typeConfig = {
  jks: { apiType: "jks", extension: ".jks", label: "JKS" },
  "jks-keystore": { apiType: "jks", extension: ".keystore", label: "JKS" },
  pkcs12: { apiType: "pkcs12", extension: ".p12", label: "PKCS12" },
  "pkcs12-pfx": { apiType: "pkcs12", extension: ".pfx", label: "PKCS12" }
};

function t(key, values = {}) {
  let text = translations[state.lang][key] || translations.zh[key] || key;
  Object.entries(values).forEach(([name, value]) => {
    text = text.replace(`{${name}}`, value);
  });
  return text;
}

function setBusy(isBusy) {
  generateButton.disabled = isBusy;
  inspectButton.disabled = isBusy;
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", isError);
  statusNode.removeAttribute("data-i18n");
}

function formValues(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const config = typeConfig[values.keystoreType] || typeConfig.jks;
  values.keystoreType = config.apiType;
  return values;
}

function replaceExtension(filePath, extension) {
  if (!filePath) return filePath;
  return filePath.replace(/\.(jks|keystore|p12|pfx)$/i, "") + extension;
}

function syncOutputPathExtension() {
  const config = typeConfig[keystoreTypeSelect.value] || typeConfig.jks;
  outputPathInput.placeholder = t("savePathTypePlaceholder", { extension: config.extension });
  outputPathInput.value = replaceExtension(outputPathInput.value, config.extension);
  generateButton.textContent = t("generateButton", { type: config.label });
}

function applyLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    node.dataset.i18nAttr.split(";").forEach((item) => {
      const [attribute, key] = item.split(":");
      node.setAttribute(attribute, t(key));
    });
  });
  document.querySelectorAll(".language-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === lang);
  });
  syncOutputPathExtension();
}

function field(label, value) {
  const row = document.createElement("div");
  row.className = "field";

  const name = document.createElement("div");
  name.className = "field-name";
  name.textContent = label;

  const text = document.createElement("div");
  text.className = "field-value";
  text.textContent = value || "";

  const copy = document.createElement("button");
  copy.className = "copy-button";
  copy.type = "button";
  copy.textContent = t("copy");
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(value || "");
    copy.textContent = t("copied");
    window.setTimeout(() => {
      copy.textContent = t("copy");
    }, 900);
  });

  row.append(name, text, copy);
  return row;
}

function renderEntries(entries, metadata = {}) {
  resultsNode.replaceChildren();
  const lines = [];

  entries.forEach((entry, index) => {
    const wrapper = document.createElement("article");
    wrapper.className = "entry";

    const title = document.createElement("div");
    title.className = "entry-title";
    title.innerHTML = `<span>${entry.alias || `Certificate ${index + 1}`}</span><span>${metadata.storeType || ""}</span>`;
    wrapper.append(title);

    const rows = [
      [t("signatureLabel"), entry.signature],
      [t("signatureMd5Label"), entry.signatureMd5],
      [t("signatureSha1Label"), entry.signatureSha1],
      [t("signatureSha256Label"), entry.signatureSha256],
      ["MD5", entry.compact?.md5],
      ["SHA1", entry.compact?.sha1],
      ["SHA256", entry.compact?.sha256],
      [t("publicKeyAlgorithmLabel"), entry.publicKeyAlgorithm],
      [t("publicKeyMd5Label"), entry.publicKeyMd5],
      [t("publicKeySha1Label"), entry.publicKeySha1],
      [t("publicKeySha256Label"), entry.publicKeySha256],
      ["Public Key MD5", entry.compact?.publicKeyMd5],
      ["Public Key SHA1", entry.compact?.publicKeySha1],
      ["Public Key SHA256", entry.compact?.publicKeySha256],
      [t("publicKeyPemLabel"), entry.publicKeyPem],
      [t("publicKeyLabel"), entry.publicKey],
      [t("subjectLabel"), entry.subject],
      [t("issuerLabel"), entry.issuer],
      [t("serialLabel"), entry.serialNumber],
      [t("validFromLabel"), entry.validFrom],
      [t("validToLabel"), entry.validTo]
    ];

    rows.forEach(([label, value]) => {
      wrapper.append(field(label, value));
      lines.push(`${label}: ${value || ""}`);
    });

    resultsNode.append(wrapper);
  });

  state.lastText = lines.join("\n");
}

document.querySelectorAll(".language-button").forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang);
    if (state.lastEntries) renderEntries(state.lastEntries.entries, state.lastEntries.metadata);
  });
});

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    Object.values(panels).forEach((panel) => panel.classList.remove("active"));
    panels[button.dataset.panel].classList.add("active");
  });
});

document.querySelector("#pick-save").addEventListener("click", async () => {
  const config = typeConfig[keystoreTypeSelect.value] || typeConfig.jks;
  const filePath = await window.keystoreApi.pickSavePath(config.apiType);
  if (filePath) outputPathInput.value = replaceExtension(filePath, config.extension);
});

document.querySelector("#pick-open").addEventListener("click", async () => {
  const filePath = await window.keystoreApi.pickKeystoreFile();
  if (filePath) document.querySelector("#filePath").value = filePath;
});

generateButton.addEventListener("click", async () => {
  const form = document.querySelector("#generate-form");
  if (!form.reportValidity()) return;
  const config = typeConfig[keystoreTypeSelect.value] || typeConfig.jks;

  setBusy(true);
  setStatus(t("generateBusy", { type: config.label }));
  try {
    const result = await window.keystoreApi.generate(formValues(form));
    state.lastEntries = { entries: [result], metadata: result };
    renderEntries([result], result);
    setStatus(t("generateDone", { path: result.outputPath }));
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

inspectButton.addEventListener("click", async () => {
  const form = document.querySelector("#inspect-form");
  if (!form.reportValidity()) return;

  setBusy(true);
  setStatus(t("inspectBusy"));
  try {
    const result = await window.keystoreApi.inspect(formValues(form));
    state.lastEntries = { entries: result.entries, metadata: result };
    renderEntries(result.entries, result);
    setStatus(t("inspectDone", { count: result.entries.length }));
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

document.querySelector("#copy-all").addEventListener("click", async () => {
  if (!state.lastText) return;
  await navigator.clipboard.writeText(state.lastText);
  setStatus(t("copied"));
});

keystoreTypeSelect.addEventListener("change", syncOutputPathExtension);
applyLanguage(state.lang);
