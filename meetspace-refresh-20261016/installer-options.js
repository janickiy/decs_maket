/* Installer options and plan preview. Static demo metadata; secrets exist only in form controls. */
(() => {
  const api = window.MSInstaller;
  const { M, I, e, S, frame, heading, field, progress, demo, showError, secretField, bindSecrets, register, go, notify } = api;
  const error = '<div class="on-form-error" role="alert" hidden></div>';
  const textAttrs = 'autocomplete="off" autocapitalize="none" spellcheck="false"';
  const forbiddenAdminPorts = new Set([8082, 3478, 5349, 50010]);
  const integerPort = value => /^\d{1,5}$/.test(String(value)) ? Number(value) : 0;
  const validAdminOptions = value => !!value && /^[a-z0-9][a-z0-9.@+_-]{2,39}$/.test(value.username) &&
    Number.isInteger(value.httpsPort) && value.httpsPort >= 1024 && value.httpsPort <= 65535 &&
    !forbiddenAdminPorts.has(value.httpsPort) && !(value.httpsPort >= 49160 && value.httpsPort <= 49259);
  const validHost = value => typeof value === "string" && value.length >= 1 && value.length <= 253 &&
    /^[A-Za-z0-9.-]+$/.test(value) && value.split(".").every(part => part.length >= 1 && part.length <= 63 && /^[A-Za-z0-9]/.test(part) && /[A-Za-z0-9]$/.test(part));
  const validEmail = value => {
    if (typeof value !== "string" || value.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(value)) return false;
    const [local, host] = value.split("@");
    return local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..") && validHost(host);
  };
  const validSmtpOptions = value => !!value && validHost(value.host) && Number.isInteger(value.port) && value.port >= 1 && value.port <= 65535 &&
    validEmail(value.from) && typeof value.username === "string" && value.username.trim().length > 0 &&
    new TextEncoder().encode(value.username).length <= 512 && !/[\x00-\x1f\x7f]/.test(value.username) && ["tls", "starttls"].includes(value.tlsMode);
  const validAdminPassword = value => {
    if (typeof value !== "string") return false;
    const bytes = new TextEncoder().encode(value);
    try {
      const length = Array.from(value).length;
      return length >= 8 && length <= 128 && bytes.length <= 512 && new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes) === value && !/[\r\n\0]/.test(value);
    } finally { bytes.fill(0); }
  };
  const validSmtpPassword = value => {
    if (typeof value !== "string") return false;
    const bytes = new TextEncoder().encode(value);
    try { return bytes.length > 0 && bytes.length <= 4096 && new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes) === value && !/[\r\n\0]/.test(value); }
    finally { bytes.fill(0); }
  };
  const validImageRelease = value => value === "latest" || typeof value === "string" && value.length <= 64 && /^v?\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(value);
  const normalizeInstallDomain = value => {
    if (typeof value !== "string") return null;
    const name = value.trim().replace(/^https:\/\//i, "").replace(/\/$/, "");
    if (!name || name.length > 253 || /[\s\x00-\x1f\x7f/\\:@?#%\[\]$'"`()]/.test(name) || name.endsWith(".") || /^[\d.]+$/.test(name)) return null;
    try {
      const ascii = new URL(`https://${name}`).hostname;
      return ascii.includes(".") && ascii.length <= 253 && !/^[\d.]+$/.test(ascii) && !["test", "invalid", "localhost", "local", "internal", "example"].includes(ascii.split(".").at(-1)) && ascii.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ? ascii : null;
    } catch { return null; }
  };
  const validIpv4 = value => {
    if (typeof value !== "string" || value.split(".").length !== 4 || !value.split(".").every(part => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)) return false;
    const [a, b, c, d] = value.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
      a === 192 && (b === 168 || b === 0 && (c === 0 && d !== 9 && d !== 10 || c === 2) || b === 88 && c === 99) ||
      a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
  };
  const adminOptions = state => ({ username: state.adminUsername, httpsPort: integerPort(state.adminPort) });
  const smtpOptions = state => ({ host: state.smtpHost, port: integerPort(state.smtpPort), from: state.smtpFrom, username: state.smtpUsername, tlsMode: state.smtpTls });
  const validateAccountOptions = state => {
    if (!validAdminOptions(adminOptions(state))) return { field: !/^[a-z0-9][a-z0-9.@+_-]{2,39}$/.test(state.adminUsername) ? "adminUsername" : "adminPort", message: "Логин: 3–40 символов a–z, 0–9, . - _ @ +. Порт: 1024–65535, кроме 8082, 3478, 5349, 50010 и 49160–49259." };
    if (state.smtpEnabled && !validSmtpOptions(smtpOptions(state))) return { field: "smtpHost", message: "Проверьте SMTP: имя сервера, порт 1–65535, email отправителя и логин без управляющих символов (до 512 байт)." };
    return null;
  };
  const validateInstallOptions = state => {
    if (!["source", "images"].includes(state.installMode)) return { field: "installMode", message: "Выберите способ установки." };
    if (!normalizeInstallDomain(state.domain)) return { field: "domain", message: "Укажите публичное доменное имя без пути, порта и параметров. Доменные зоны test, invalid, localhost, local, internal и example не поддерживаются." };
    if (!validIpv4(state.publicIpv4)) return { field: "publicIpv4", message: "Укажите глобальный публичный IPv4 VPS. Частные, локальные, служебные и демонстрационные диапазоны не поддерживаются." };
    if (!["letsencrypt", "custom"].includes(state.certificateMode)) return { field: "certificateMode", message: "Выберите способ настройки HTTPS-сертификата." };
    return validateAccountOptions(state);
  };
  const fixture = Object.freeze({
    architecture: "amd64", version: "demo-v0.0.0-beta", commit: "0123456789abcdef0123456789abcdef01234567",
    hash: "0123456789abcdef".repeat(4), sourceSha256: "abcdef0123456789".repeat(4),
    imageArchiveSha256: "123456789abcdef0".repeat(4), imageArchiveBytes: 536870912,
    sourceSelection: "main", sourceRef: "refs/heads/main",
  });
  const demoPlan = (state = S()) => ({ ...fixture, imageMode: state.installMode, resourceProfile: state.resourceProfile, dockerAction: state.dockerAction, certificateMode: state.certificateMode });
  Object.assign(api, { validAdminOptions, validSmtpOptions, validAdminPassword, validSmtpPassword, validImageRelease, validEmail, validIpv4, normalizeInstallDomain, validateInstallOptions, demoPlan });

  const certificatePemError = (text, kind) => {
    const value = String(text).trim();
    const blocks = kind === "certificate" ? [...value.matchAll(/-----BEGIN CERTIFICATE-----([A-Za-z0-9+/=\s]+)-----END CERTIFICATE-----/g)] : [...value.matchAll(/-----BEGIN ((?:RSA |EC )?PRIVATE KEY)-----([A-Za-z0-9+/=\s]+)-----END \1-----/g)];
    const label = kind === "certificate" ? "сертификат с цепочкой в формате PEM" : "незашифрованный приватный ключ в формате PEM";
    if (!blocks.length || kind === "key" && blocks.length !== 1 || blocks.reduce((rest, match) => rest.replace(match[0], ""), value).trim()) return `Выберите ${label}.`;
    try {
      for (const block of blocks) {
        const body = block[kind === "certificate" ? 1 : 2].replace(/\s/g, "");
        if (body.length < 16 || body.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body) || atob(body).length < 8) return `Не удалось прочитать ${label}.`;
      }
      return "";
    } catch { return `Не удалось прочитать ${label}.`; }
  };
  api.certificatePemError = certificatePemError;
  const certificateUpload = (name, title, hint, accept) => `<label class="ins-certificate-upload"><span class="ins-upload-icon">${I(name === "tlsCertificate" ? "FileText" : "KeyRound")}</span><span class="ins-upload-copy"><strong>${title}</strong><small>${hint}</small><span class="ins-upload-name" data-upload-name="${name}" aria-live="polite">Выбрать файл</span></span><input class="ins-certificate-file" type="file" name="${name}" aria-label="${title}" accept="${accept}"></label>`;

  const section = (title, content, attrs = "") => `<section class="ins-card ins-stack" ${attrs}>${title ? `<h2 class="ins-section-title">${title}</h2>` : ""}${content}</section>`;
  const switchField = (name, title, subtitle, checked) => `<label class="on-admin-switch"><span><strong>${title}</strong>${subtitle ? `<small>${subtitle}</small>` : ""}</span><input class="toggle" type="checkbox" role="switch" name="${name}" ${checked ? "checked" : ""}></label>`;
  const meta = rows => `<dl class="ins-meta">${rows.map(([label, value]) => `<div${String(value).length > 32 ? ' class="ins-meta-long"' : ""}><dt>${e(label)}</dt><dd${/SHA-256|Commit/.test(label) ? ' class="ins-meta-code"' : ""}>${e(value)}</dd></div>`).join("")}</dl>`;
  const fail = (form, issue) => {
    showError(form, issue.message);
    const input = form.elements[issue.field];
    if (input?.focus) { input.setAttribute("aria-invalid", "true"); input.focus(); }
  };
  const clearErrors = form => {
    form.querySelector(".on-form-error").hidden = true;
    form.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"));
  };
  const clearFormSecrets = form => {
    form.querySelectorAll('input[type="password"], input[type="file"], input[data-secret], input[name="sshPassword"], input[name="sshPassphrase"], input[name="adminPassword"], input[name="adminConfirmation"], input[name="smtpPassword"]').forEach(input => { input.value = ""; });
  };
  const bindResetOnNavigation = form => {
    document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => { clearFormSecrets(form); form.reset(); }));
  };

  register("install-options", "Параметры установки", () => {
    if (S().hasJob) return api.pendingView();
    const state = S();
    return frame(`${progress(4)}${heading("ПАРАМЕТРЫ УСТАНОВКИ", "Подготовим пространство.", "Выберите способ установки и параметры сервера. Сначала покажем план изменений.")}
      <form id="ins-options-form" class="on-form ins-stack" novalidate>
        <fieldset class="on-install-options ins-card"><legend>Способ установки</legend><div class="on-install-modes">${[
          ["images", "Download", "Готовые образы", "Последний опубликованный пакет для вашего VPS. Без компиляции на сервере."],
          ["source", "Server", "Сборка на сервере", "Последний commit основной ветки GitHub: закрепить исходники и собрать образы на VPS. Включает актуальную админку и поддержку LDAP."],
        ].map(([value, icon, title, copy]) => `<label class="on-install-mode"><input type="radio" name="installMode" value="${value}" ${state.installMode === value ? "checked" : ""}><span class="on-mode-icon">${I(icon)}</span><span class="on-mode-copy"><strong>${title}</strong><small>${copy}</small></span></label>`).join("")}</div><p id="ins-images-note" class="ins-note" ${state.installMode === "images" ? "" : "hidden"}>Последний опубликованный выпуск выбирается автоматически, включая beta. Версию, коммит и размер покажем перед установкой.</p></fieldset>
        ${section("Требования к VPS", `<p class="ins-note">Новый выделенный VPS: Ubuntu 22.04 или 24.04 LTS, amd64 или arm64. Минимум: 2 CPU, 4 ГБ RAM и около 20 ГБ свободного диска (18 ГиБ). Рекомендуется: 4 CPU, 8 ГБ RAM и 30 ГиБ свободно.</p><p class="ins-note">Минимальная конфигурация рассчитана на небольшую нагрузку. Для параллельных встреч и записи выбирайте рекомендуемую конфигурацию; доступная нагрузка зависит от участников и качества видео.</p><p class="ins-note">Нужен root или sudo без пароля. DNS A должен указывать на этот IPv4; IPv6 и CDN пока не поддерживаются.</p>`)}
        ${section("Адрес сервера", `${field("Домен MeetSpace", "domain", state.domain, "meet.example.org", `${textAttrs} ${state.accessAvailable ? 'readonly aria-readonly="true"' : ""}`)}${field("Публичный IPv4 VPS", "publicIpv4", state.publicIpv4, "203.0.113.10", `${textAttrs} inputmode="decimal"`)}`)}
        ${section("HTTPS-сертификат", `<fieldset class="on-install-options ins-card"><legend class="ins-note">Как защитить соединение</legend><div class="on-install-modes ins-certificate-modes">${[
          ["letsencrypt", "ShieldCheck", "Let's Encrypt", "Бесплатный сертификат с автоматическим выпуском и продлением."],
          ["custom", "FileKey", "SSL-сертификат", "Использовать ssl сертификат и приватный ключ в формате PEM"],
        ].map(([value, icon, title, copy]) => `<label class="on-install-mode"><input type="radio" name="certificateMode" value="${value}" ${state.certificateMode === value ? "checked" : ""}><span class="on-mode-icon">${I(icon)}</span><span class="on-mode-copy"><strong>${title}</strong><small>${copy}</small></span></label>`).join("")}</div></fieldset><div id="ins-acme-info" class="ins-stack" ${state.certificateMode === "letsencrypt" ? "" : "hidden"}><p class="ins-note">Сертификат будет выпущен для домена MeetSpace.</p></div><div id="ins-custom-certificate-info" class="ins-stack" ${state.certificateMode === "custom" ? "" : "hidden"}><p class="ins-note">На следующем шаге прикрепите сертификат с цепочкой и соответствующий приватный ключ. Сертификат должен быть действующим и подходить для домена MeetSpace.</p><p class="ins-note">Срок действия и обновление своего сертификата вы контролируете самостоятельно.</p></div>`)}
        ${section("Административная панель", `<div class="ins-stack"><div class="ins-grid-two">${field("Логин администратора", "adminUsername", state.adminUsername, "admin", `${textAttrs} maxlength="40"`)}${field("HTTPS-порт админки", "adminPort", state.adminPort, "8081", 'inputmode="numeric" type="number" min="1024" max="65535"')}</div><p class="ins-note">3–40 символов: латинские буквы, цифры, . - _ @ +</p><p class="ins-note">Пароль задаётся перед установкой. LDAP / Active Directory и почта настраиваются в админке.</p></div>`)}
        ${section("Отправка email", `${switchField("smtpEnabled", "Настроить отправку email", "Уведомления и напоминания о встречах", state.smtpEnabled)}<div id="ins-smtp-fields" class="ins-stack" ${state.smtpEnabled ? "" : "hidden"}>${field("Сервер SMTP", "smtpHost", state.smtpHost, "smtp.example.org", textAttrs)}${switchField("smtpStartTls", `<span id="ins-smtp-tls-label">${state.smtpTls === "starttls" ? "STARTTLS · обычно порт 587" : "TLS · обычно порт 465"}</span>`, "Защита соединения", state.smtpTls === "starttls")}${field("Порт SMTP", "smtpPort", state.smtpPort, "465", 'type="number" inputmode="numeric" min="1" max="65535"')}${field("Email отправителя", "smtpFrom", state.smtpFrom, "meetspace@example.org", `${textAttrs} type="email" inputmode="email"`)}${field("Логин SMTP", "smtpUsername", state.smtpUsername, "meetspace@example.org", textAttrs)}<p class="ins-note">Пароль приложения или SMTP будет запрошен перед установкой. На устройстве он не сохраняется.</p></div><p id="ins-smtp-disabled" class="ins-note" ${state.smtpEnabled ? "hidden" : ""}>Без SMTP письма не отправляются. Подключить почту можно позже на сервере.</p>`)}
        ${state.accessAvailable ? '<p class="ins-note">Доступ SSH уже проверен. Проверьте параметры установки и учётную запись администратора.</p>' : section("Доступ к серверу", `<p class="ins-note">${e(state.username)}@${e(state.host)}:${e(state.port)} · демонстрационный доступ</p><label class="field on-field"><span>Способ входа SSH</span><select name="auth"><option value="password" ${state.auth === "password" ? "selected" : ""}>Пароль SSH</option><option value="key" ${state.auth === "key" ? "selected" : ""}>Приватный ключ</option></select></label><div id="ins-ssh-password" ${state.auth === "key" ? "hidden" : ""}>${secretField("sshPassword", "Пароль SSH", "Введите демонстрационный пароль")}</div><div id="ins-ssh-key" class="ins-stack" ${state.auth === "key" ? "" : "hidden"}><label class="field on-field"><span>Приватный ключ</span><input type="file" name="sshKey" aria-describedby="ins-key-hint"></label><small id="ins-key-hint" class="ins-note">До 256 КиБ. OpenSSH v1: без пароля или bcrypt до 64 раундов. RSA/EC PEM: только без шифрования. Файл проверяется локально; содержимое не сохраняется и не отправляется.</small>${secretField("sshPassphrase", "Парольная фраза ключа", "Если ключ защищён")}</div>`)}
        ${error}<button id="ins-options-next" type="submit" class="button primary wide" aria-describedby="ins-options-hint">Получить план без установки ${I("ArrowRight")}</button><p id="ins-options-hint" class="ins-note" role="status" hidden></p>
      </form>${demo("План состоит из статических примеров. SSH и сетевые запросы не выполняются; пароли и ключи не сохраняются.")}`, { back: "preflight", install: true });
  }, () => {
    if (S().hasJob) { api.bindPending(); return; }
    const form = document.getElementById("ins-options-form");
    bindSecrets(form);
    bindResetOnNavigation(form);
    let keyReady = false, keyIssue = "";
    const publicInputs = ["installMode", "certificateMode", "domain", "publicIpv4", "adminUsername", "adminPort", "smtpHost", "smtpPort", "smtpFrom", "smtpUsername"];
    const readOptions = () => {
      const options = Object.fromEntries(publicInputs.map(key => [key, form.elements[key].value.trim()]));
      options.adminUsername = options.adminUsername.toLowerCase();
      options.domain = normalizeInstallDomain(options.domain) || options.domain;
      options.smtpEnabled = form.elements.smtpEnabled.checked;
      options.smtpTls = form.elements.smtpStartTls.checked ? "starttls" : "tls";
      if (form.elements.auth) options.auth = form.elements.auth.value;
      return options;
    };
    const save = () => {
      Object.assign(S(), readOptions());
      notify();
    };
    const updateNext = () => {
      const issue = validateAccountOptions(readOptions());
      const needsKey = !S().accessAvailable && form.elements.auth.value === "key" && !keyReady;
      const hint = document.getElementById("ins-options-hint");
      document.getElementById("ins-options-next").disabled = !!issue || needsKey;
      hint.textContent = issue?.message || (needsKey ? keyIssue || "Выберите поддерживаемый приватный ключ до 256 КиБ." : "");
      hint.hidden = !hint.textContent;
    };
    form.addEventListener("input", () => { clearErrors(form); updateNext(); });
    form.addEventListener("change", event => {
      if (event.target.name === "smtpStartTls") form.elements.smtpPort.value = event.target.checked ? "587" : "465";
      if (event.target.name === "auth") { clearFormSecrets(form); keyReady = false; keyIssue = ""; }
      save();
      document.getElementById("ins-smtp-tls-label").textContent = S().smtpTls === "starttls" ? "STARTTLS · обычно порт 587" : "TLS · обычно порт 465";
      document.getElementById("ins-images-note").hidden = S().installMode !== "images";
      document.getElementById("ins-acme-info").hidden = S().certificateMode !== "letsencrypt";
      document.getElementById("ins-custom-certificate-info").hidden = S().certificateMode !== "custom";
      document.getElementById("ins-smtp-fields").hidden = !S().smtpEnabled;
      document.getElementById("ins-smtp-disabled").hidden = S().smtpEnabled;
      if (form.elements.auth) {
        document.getElementById("ins-ssh-password").hidden = S().auth === "key";
        document.getElementById("ins-ssh-key").hidden = S().auth !== "key";
      }
      updateNext();
    });
    form.elements.sshKey?.addEventListener("change", async () => {
      keyReady = false;
      keyIssue = "Проверяем формат ключа…";
      updateNext();
      const file = form.elements.sshKey.files[0];
      if (!file || !file.size || file.size > 256 * 1024) {
        keyIssue = !file ? "Выберите файл приватного ключа." : !file.size ? "Файл ключа пуст." : "Размер файла ключа не должен превышать 256 КиБ.";
        updateNext();
        return;
      }
      let contents = "";
      try {
        contents = await file.text();
        if (!form.isConnected || form.elements.sshKey.files[0] !== file) return;
        keyIssue = api.keyError(contents);
        keyReady = !keyIssue;
      } catch { keyIssue = "Не удалось прочитать ключ. Выберите другой файл."; }
      finally { contents = ""; }
      if (form.isConnected) updateNext();
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      clearErrors(form);
      save();
      if (S().diagnosticScenario === "blocked") return showError(form, "Устраните препятствия, обнаруженные диагностикой, и повторите проверку сервера. План установки не создан.");
      const issue = validateInstallOptions(S());
      if (issue) return fail(form, issue);
      if (!S().accessAvailable) {
        if (S().auth === "key" && !keyReady) return fail(form, { field: "sshKey", message: keyIssue || "Выберите поддерживаемый приватный ключ до 256 КиБ." });
        if (S().auth !== "key" && !form.elements.sshPassword.value) return fail(form, { field: "sshPassword", message: "Введите демонстрационный пароль SSH." });
      }
      S().accessAvailable = true;
      S().accessUntil = Date.now() + 600000;
      S().planExpired = false;
      S().server = `https://${S().domain}`;
      clearFormSecrets(form);
      form.reset();
      notify();
      go("install-plan");
    });
    updateNext();
  });

  const dockerActionText = state => state.dockerAction === "plugins" ? "Установить недостающие компоненты Docker (Compose/Buildx); использовать установленный Docker" : state.dockerAction === "install" ? "Установить закреплённые Docker, Compose и Buildx" : state.installMode === "images" ? "Использовать Docker и Compose на сервере" : "Использовать Docker, Compose и Buildx на сервере";
  const consent = (name, copy) => `<label class="ins-consent"><input type="checkbox" name="${name}"><span>${copy}</span></label>`;
  register("install-plan", "План установки", () => {
    if (S().hasJob) return api.pendingView();
    const state = S(), plan = demoPlan(state), images = state.installMode === "images";
    const compact = state.resourceProfile === "compact-test";
    const customCertificate = state.certificateMode === "custom";
    const dockerRequired = state.dockerAction === "install" || state.dockerAction === "plugins";
    return frame(`${progress(4)}${heading("04 / ПЛАН ИЗМЕНЕНИЙ", "Всё под вашим контролем.", "Проверьте действия и подтвердите установку. До подтверждения сервер не меняется.")}
      <div class="ins-stack">${section("План изменений", `<span class="ins-note">Демо-план · все версии, хеши, размеры и характеристики ниже — статические примеры.</span>${meta([
        ["Способ", images ? "Готовые образы" : "Сборка на сервере"], ["Режим ресурсов", compact ? "Компактный · compact-test" : "Стандартный · standard"],
        ["Адрес", `https://${state.domain}`], ["IPv4", state.publicIpv4 || "Не указан"], ["Архитектура · демо", plan.architecture], ["Версия · демо", plan.version],
        ["Commit · демо", plan.commit], ["SHA-256 плана · демо", plan.hash],
        ...(images ? [["Пакет · демо", `${plan.imageArchiveBytes / (1024 * 1024)} МиБ · ${plan.imageArchiveBytes} байт`], ["SHA-256 пакета · демо", plan.imageArchiveSha256]] : [["Источник GitHub · демо", plan.sourceSelection], ["Ref · демо", plan.sourceRef], ["SHA-256 исходников · демо", plan.sourceSha256]]),
        ["Docker", dockerActionText(state)], ["HTTPS-сертификат", customCertificate ? "SSL-сертификат · PEM" : "Let’s Encrypt · автоматический"], ["Обновление сертификата", customCertificate ? "Самостоятельно" : "Автоматически"],
      ])}${compact ? '<p class="ins-note">Для небольшой нагрузки: 2 CPU, 4 ГБ RAM и около 20 ГБ свободного диска (18 ГиБ). Параллельные встречи и запись требуют больше ресурсов: рекомендуются 4 CPU, 8 ГБ RAM и 30 ГиБ свободного диска. Доступная нагрузка зависит от участников и качества видео.</p>' : ""}${meta([["Админка", `https://${state.domain}:${state.adminPort}`], ["Логин", state.adminUsername], ["LDAP / Active Directory", "Настройка после установки в админке"]])}${state.smtpEnabled ? meta([["Почта", `${state.smtpHost}:${state.smtpPort} · ${state.smtpTls.toUpperCase()}`], ["Отправитель", state.smtpFrom], ["Напоминание о встрече", "За 3 часа"]]) : '<p class="ins-note">SMTP не настроен. Письма не отправляются.</p>'}`)}
      ${section("Что будет сделано", `<p class="ins-note">${e(dockerActionText(state))}; ${images ? "скачать пакет выпуска и файлы конфигурации; проверить контрольные суммы, архитектуру и отчёты безопасности; загрузить готовые образы в Docker" : "скачать исходники выбранного commit основной ветки; собрать образы приложения и админки"}; создать /opt/meetspace, секреты и закрытые тома; сохранить копию БД; выполнить миграции; ${customCertificate ? "подключить ваш сертификат и приватный ключ" : "выпустить сертификат Let’s Encrypt"}; настроить HTTPS/WSS и TURN; проверить готовность.</p>`)}
      ${section("Сеть и важные условия", `<p class="ins-note">Публичные порты: TCP 80, 443, 3478, 5349, 50010, ${e(state.adminPort)} (админка); UDP 3478, 50010, 49160–49259. Откройте их в firewall провайдера. Docker может обходить правила UFW. БД, Redis, RabbitMQ и S3 наружу не публикуются.</p><p class="ins-note">Выбранные режим, версия и commit сохраняются на сервере; повторный запуск продолжает этот же план. Откат данных автоматически не выполняется. Копия БД локальная; внешние резервные копии настраиваются отдельно. ${customCertificate ? "Вы отвечаете за своевременную замену своего сертификата. После замены потребуется применить его к HTTPS и TURN." : "Продление сертификата перезапускает TURN."} ${images ? "Архив закреплён по SHA-256; переход к сборке требует отдельного выбора." : "Исходники и базовые образы закреплены, пакеты внутри сборки могут меняться."}</p>`)}
      <button class="ins-text-link" data-go="install-options">${I("ArrowLeft")} Изменить параметры</button>
      <details class="ins-card ins-stack"><summary>Сценарии макета</summary><p class="ins-note">Меняют только демо-план. Повторно подтвердите изменённый план.</p><div class="ins-grid-two"><label class="field on-field"><span>Режим ресурсов</span><select id="ins-resource-profile"><option value="standard" ${compact ? "" : "selected"}>Стандартный</option><option value="compact-test" ${compact ? "selected" : ""}>Компактный</option></select></label><label class="field on-field"><span>Действие Docker</span><select id="ins-docker-action"><option value="install" ${state.dockerAction === "install" ? "selected" : ""}>Установить Docker</option><option value="plugins" ${state.dockerAction === "plugins" ? "selected" : ""}>Добавить Compose/Buildx</option><option value="reuse" ${state.dockerAction === "reuse" ? "selected" : ""}>Использовать установленный</option></select></label></div><button id="ins-expire-plan" class="button" type="button">Показать истёкший план</button></details>
      ${state.planExpired ? '<div class="ins-card ins-stack" role="status"><h2 class="ins-section-title">Срок действия плана истёк</h2><p class="ins-note">Получите новый план и подтвердите его ещё раз. Установка пока не запускается.</p><button id="ins-refresh-plan" type="button" class="button primary wide">Обновить план без установки</button></div>' : ""}
      <form id="ins-plan-form" class="on-form ins-stack" novalidate>
        ${customCertificate ? section("Ваш HTTPS-сертификат", `<p class="ins-note">Для домена <strong>${e(state.domain || "MeetSpace")}</strong>. Прикрепите два файла перед установкой.</p>${certificateUpload("tlsCertificate", "Сертификат и цепочка", "PEM, CRT или CER в формате PEM · до 256 КиБ", ".pem,.crt,.cer")}${certificateUpload("tlsPrivateKey", "Приватный ключ сертификата", "Незашифрованный PEM или KEY · до 256 КиБ", ".pem,.key")}<p class="ins-note">В макете проверяется только формат PEM. Файлы не сохраняются и не отправляются на сервер.</p>`) : ""}
        ${section("Пароль администратора", `<p class="ins-note">Отдельная учётная запись админки: <strong>${e(state.adminUsername)}</strong>.</p>${secretField("adminPassword", "Пароль администратора", "От 8 до 128 символов")}${secretField("adminConfirmation", "Повторите пароль", "Введите пароль ещё раз")}<p class="ins-note">От 8 до 128 символов. В приложении пароль передаётся по SSH при установке. В макете он не отправляется и не сохраняется.</p>`)}
        ${state.smtpEnabled ? section("Пароль для отправки email", `${secretField("smtpPassword", "Пароль SMTP / пароль приложения", "До 4096 байт")}<p class="ins-note">В приложении пароль передаётся по SSH при запуске установки и хранится на сервере в закрытом файле настроек. В макете он не отправляется и не сохраняется.</p>`) : ""}
        ${section("Подтверждения", `${dockerRequired ? consent("dockerConsent", state.dockerAction === "plugins" ? "Разрешаю установить недостающие компоненты Docker (Compose/Buildx) из официального репозитория" : "Разрешаю установить Docker, Compose и Buildx из официального репозитория") : ""}${consent("planConsent", "Проверил план и разрешаю изменения на этом VPS")}`)}
        ${error}<button id="ins-apply" type="submit" class="button primary wide" disabled>Установить MeetSpace ${I("ArrowRight")}</button><p id="ins-apply-hint" class="ins-note">${state.planExpired ? "Обновите истёкший план." : "Заполните пароли и отметьте все подтверждения."}</p>
      </form></div>${demo("Установка запускает только демонстрацию этапов. Версии и контрольные суммы — примеры, секреты очищаются при переходе.")}`, { back: "install-options", install: true });
  }, () => {
    if (S().hasJob) { api.bindPending(); return; }
    const form = document.getElementById("ins-plan-form");
    bindSecrets(form);
    bindResetOnNavigation(form);
    const certificateFiles = { tlsCertificate: { ready: false, error: "" }, tlsPrivateKey: { ready: false, error: "" } };
    const planError = () => {
      if (!S().accessAvailable) return { field: "planConsent", message: "SSH-доступ не подтверждён или истёк. Нажмите «Изменить параметры» и подтвердите доступ заново." };
      if (S().planExpired) return { field: "planConsent", message: "Срок действия плана истёк. Обновите план без установки." };
      if (S().certificateMode === "custom") {
        for (const name of ["tlsCertificate", "tlsPrivateKey"]) {
          if (!certificateFiles[name].ready) return { field: name, message: certificateFiles[name].error || (name === "tlsCertificate" ? "Выберите сертификат с цепочкой в формате PEM." : "Выберите приватный ключ сертификата в формате PEM.") };
        }
      }
      if (!validAdminPassword(form.elements.adminPassword.value)) return { field: "adminPassword", message: "Пароль администратора: 8–128 символов, до 512 байт UTF-8, без переноса строки и нулевого символа." };
      if (form.elements.adminPassword.value !== form.elements.adminConfirmation.value) return { field: "adminConfirmation", message: "Пароли администратора не совпадают." };
      if (S().smtpEnabled && !validSmtpPassword(form.elements.smtpPassword.value)) return { field: "smtpPassword", message: "Введите пароль SMTP: 1–4096 байт, без переноса строки и нулевого символа." };
      if (form.elements.dockerConsent && !form.elements.dockerConsent.checked) return { field: "dockerConsent", message: "Подтвердите установку компонентов Docker." };

      if (!form.elements.planConsent.checked) return { field: "planConsent", message: "Подтвердите план изменений на VPS." };
      return null;
    };
    const updateApply = () => {
      const issue = planError();
      form.querySelector("#ins-apply").disabled = !!issue;
      form.querySelector("#ins-apply-hint").textContent = issue ? issue.message : "Всё готово для демонстрации установки.";
    };
    form.querySelectorAll(".ins-certificate-file").forEach(input => input.addEventListener("change", async () => {
      const current = certificateFiles[input.name];
      current.ready = false;
      current.error = "Проверяем формат PEM…";
      const file = input.files[0];
      const label = input.closest(".ins-certificate-upload");
      const caption = label.querySelector(".ins-upload-name");
      label.classList.remove("is-selected");
      caption.textContent = file?.name || "Выбрать файл";
      clearErrors(form);
      updateApply();
      if (!file || !file.size || file.size > 256 * 1024) {
        current.error = !file ? "Выберите файл сертификата или ключа." : !file.size ? "Файл пуст. Выберите другой файл." : "Размер файла не должен превышать 256 КиБ.";
      } else {
        let contents = "";
        try {
          contents = await file.text();
          if (!form.isConnected || input.files[0] !== file) return;
          current.error = certificatePemError(contents, input.name === "tlsCertificate" ? "certificate" : "key");
          current.ready = !current.error;
        } catch { current.error = "Не удалось прочитать файл. Выберите его ещё раз."; }
        finally { contents = ""; }
      }
      if (!form.isConnected || input.files[0] !== file) return;
      input.setAttribute("aria-invalid", String(!current.ready));
      label.classList.toggle("is-selected", current.ready);
      if (current.ready) caption.textContent = `${file.name} · формат PEM`;
      else showError(form, current.error);
      updateApply();
    }));
    form.addEventListener("input", () => { clearErrors(form); updateApply(); });
    form.addEventListener("change", updateApply);
    const resetPlan = change => {
      clearFormSecrets(form);
      form.reset();
      change();
      notify();
      go("install-plan");
    };
    document.getElementById("ins-resource-profile").addEventListener("change", event => resetPlan(() => { S().resourceProfile = event.target.value; }));
    document.getElementById("ins-docker-action").addEventListener("change", event => resetPlan(() => { S().dockerAction = event.target.value; }));
    document.getElementById("ins-expire-plan").addEventListener("click", () => resetPlan(() => { S().planExpired = true; }));
    document.getElementById("ins-refresh-plan")?.addEventListener("click", () => resetPlan(() => { S().planExpired = false; }));
    form.addEventListener("submit", event => {
      event.preventDefault();
      const optionsIssue = validateInstallOptions(S());
      if (optionsIssue) return showError(form, `${optionsIssue.message} Вернитесь к параметрам установки.`);
      const issue = planError();
      if (issue) return fail(form, issue);
      clearFormSecrets(form);
      form.reset();
      S().hasJob = true;
      S().jobDiscovered = false;
      S().jobError = "";
      S().jobCommit = demoPlan(S()).commit;
      S().jobStatus = "running";
      S().stage = 0;
      S().detailsExpanded = false;
      S().stale = false;
      S().statusKnown = true;
      S().planExpired = false;
      notify();
      go("install");
    });
    updateApply();
  });
})();
