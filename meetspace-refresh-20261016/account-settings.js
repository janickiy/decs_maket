/* Прототип настроек аккаунта.  Настройки и черновики остаются в памяти этого предварительного просмотра. */
(() => {
  const M = window.MS, I = (name) => M.icon(name), E = (text) => M.escape(text);
  const sections = [
    ["profile", "UserRound", "Профиль", "Имя и данные аккаунта"],
    ["accounts", "Users", "Аккаунты", "Добавление и переключение"],
    ["audio", "Mic", "Аудио", "Микрофон, динамик и звук"],
    ["video", "Video", "Видео", "Камера и участники"],
    ["notifications", "Bell", "Уведомления", "События и каналы доставки"],
    ["appearance", "Palette", "Оформление", "Тема и размер текста"],
  ];
  const validSection = (id) => ["connection", "add-account"].includes(id) || sections.some(([key]) => key === id);
  const name = () => M.state.profileName || "Александр Соколов";
  const email = () => M.state.profileEmail || "alex@example.org";
  const notifications = { invitations: true, reminders: true, recording: true, email: false, sound: true };
  const s = M.state.account = {
    section: "profile", open: false, nameDraft: name(), profileSaved: false,
    mic: "default", speaker: "default", signalOutput: "default", microphoneVolume: 85, speakerVolume: 85, signalVolume: 100, autoMute: false, noise: true,
    camera: "default", cameraOff: false, selfVideo: true, hideVideo: false,
    notifications: { ...notifications }, notificationDraft: { ...notifications }, notificationSaved: false,
    textSize: 100, connectionDraft: null, connectionOriginal: null, connectionSaved: false,
  };
  M.profileInitials = () => name().trim().split(/\s+/).filter((part) => /[\p{L}\p{N}]/u.test(part)).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();
  M.accountSectionRoute = () => M.state.screen === "settings" && s.open ? s.section : null;
  M.setAccountSectionRoute = (section) => {
    const open = validSection(section), next = open ? section : "profile";
    const changed = s.open !== open || s.section !== next;
    s.open = open; s.section = next;
    return changed;
  };
  M.setAccountSectionRoute(new URLSearchParams(location.search).get("section"));
  M.applyJoinPreferences = () => { M.state.mic = !s.autoMute; M.state.camera = !s.cameraOff; };
  const portrait = (large = false) => `<span class="account-avatar ${large ? "large" : ""}" aria-hidden="true">${M.profileAvatarMarkup?.(M.profileInitials()) || E(M.profileInitials())}</span>`;
  const heading = (title, subtitle, avatar = false) => `<div class="account-panel-heading"><div><h2 id="account-heading" tabindex="-1">${title}</h2><p>${subtitle}</p></div>${avatar ? portrait(true) : ""}</div>`;
  const note = (text) => `<p class="account-note">${I("Info")}<span>${text}</span></p>`;
  const switchRow = (key, title, hint = "", source = s, disabled = false) => `<label class="account-switch-row ${disabled ? "is-disabled" : ""}"><span><strong>${title}</strong>${hint ? `<small>${hint}</small>` : ""}</span><input class="toggle" type="checkbox" role="switch" data-pref="${key}" aria-label="${title}" ${source[key] ? "checked" : ""} ${disabled ? "disabled" : ""}/></label>`;
  const select = (key, title, choices, hint = "") => `<label class="account-field"><span>${title}</span><select data-pref="${key}" aria-label="${title}">${choices.map(([value, label]) => `<option value="${value}" ${String(s[key]) === value ? "selected" : ""}>${label}</option>`).join("")}</select>${hint ? `<small>${hint}</small>` : ""}</label>`;
  const audioOutputs = [["default", "По умолчанию"], ["device", "Динамик устройства"], ["headset", "Наушники"], ["bluetooth", "Bluetooth-гарнитура"]];
  const audioInputs = [["default", "По умолчанию"], ["device", "Микрофон устройства"], ["headset", "Микрофон гарнитуры"]];
  const audioTestLabels = { mic: "микрофон", speaker: "динамик", signals: "сигналы" };
  const audioStopLabels = { mic: "микрофона", speaker: "динамика", signals: "сигналов" };
  const audioVolumeKeys = { mic: "microphoneVolume", speaker: "speakerVolume", signals: "signalVolume" };
  const audioSelect = (key, label, choices) => `<select data-pref="${key}" aria-label="${label}">${choices.map(([value, text]) => `<option value="${value}" ${s[key] === value ? "selected" : ""}>${text}</option>`).join("")}</select>`;
  const audioTest = (kind) => `<button type="button" class="account-audio-test" data-action="accountAudioTest" data-audio-test="${kind}" aria-label="Проверить ${audioTestLabels[kind]}" aria-pressed="false">${I(kind === "mic" ? "Mic" : "Play")}<span>Проверить</span></button>`;
  const audioMeter = (label) => `<span class="account-audio-meter" role="img" aria-label="${label}">${Array.from({length: 8}, (_, i) => `<i style="--bar:${i}"></i>`).join("")}</span>`;
  const volume = (key, label) => `<div class="account-volume"><div><label for="account-${key}">${label}</label><output id="account-${key}-value" for="account-${key}">${s[key]}%</output></div><input id="account-${key}" type="range" min="0" max="100" step="1" value="${s[key]}" data-audio-volume="${key}" aria-valuetext="${s[key]}%"/></div>`;
  const audioOutputCard = ({ kind, title, deviceKey, deviceLabel, volumeLabel, hint }) => `
    <section class="account-audio-card" data-audio-card="${kind}" aria-labelledby="account-${kind}-heading">
      <header><h3 id="account-${kind}-heading">${title}</h3>${audioMeter("Тестовый звук")}</header>
      ${hint ? `<p class="account-audio-hint">${hint}</p>` : ""}
      <div class="account-audio-select-row">${audioSelect(deviceKey, deviceLabel, audioOutputs)}${audioTest(kind)}</div>
      <p class="account-audio-hint account-audio-test-status" role="status"></p>
      ${volume(audioVolumeKeys[kind], volumeLabel)}
      <button type="button" class="account-text-button" data-action="accountChooseOutput" data-device-pref="${deviceKey}">Выбрать другое устройство</button>
    </section>`;
  function setAudioTest(button, playing) {
    const card = button.closest("[data-audio-card]"), kind = button.dataset.audioTest;
    button.dataset.testRun = String(Number(button.dataset.testRun || 0) + 1);
    button.setAttribute("aria-pressed", String(playing));
    button.setAttribute("aria-label", playing ? `Остановить проверку ${audioStopLabels[kind]}` : `Проверить ${audioTestLabels[kind]}`);
    button.innerHTML = `${I(playing ? "Square" : kind === "mic" ? "Mic" : "Play")}<span>${playing ? "Остановить" : "Проверить"}</span>`;
    card.classList.toggle("testing", playing);
    const status = card.querySelector(".account-audio-test-status");
    if (status) status.textContent = playing ? "Демонстрация проверки…" : kind === "mic" ? "Проверьте микрофон, чтобы увидеть уровень звука и названия устройств." : "";
    const level = Math.ceil(s[audioVolumeKeys[kind]] / 100 * 8);
    card.querySelectorAll(".account-audio-meter i").forEach((bar, i) => bar.classList.toggle("lit", playing && i < level));
  }
  const notificationDirty = () => ["invitations", "reminders", "recording", "email"].some((key) => s.notifications[key] !== s.notificationDraft[key]);
  let notificationPreviewRun = 0;
  function stopNotificationPreview() {
    notificationPreviewRun++;
    const button = document.getElementById("account-test-notification");
    if (!button) return;
    button.disabled = !s.notifications.sound;
    button.setAttribute("aria-busy", "false");
    button.querySelector("span").textContent = "Проверить звук";
    document.getElementById("account-notification-test-status").textContent = "";
  }
  const profile = () => `${heading("Ваш профиль", "Как вас видят участники встречи.")}${M.renderProfileAvatarEditor?.() || portrait(true)}
    <form id="account-profile-form" class="account-form" novalidate>
      <label class="account-field"><span>Имя для встреч</span><input id="account-name" name="name" value="${E(s.nameDraft)}" minlength="1" maxlength="100" required autocomplete="name" aria-describedby="account-name-hint account-name-error"/><small id="account-name-hint">От 1 до 100 символов.</small><small id="account-name-error" class="account-error" hidden>Введите имя от 1 до 100 символов.</small></label>
      <label class="account-field"><span>Email</span><input type="email" value="${E(email())}" readonly aria-describedby="account-email-hint"/><small id="account-email-hint">Адрес используется для входа. Изменение email пока недоступно.</small></label>
      <div class="account-save-row"><button id="account-save-name" class="button primary" ${!s.nameDraft.trim() || s.nameDraft.trim() === name() ? "disabled" : ""}>Сохранить имя</button><span class="account-saved" role="status">${s.profileSaved ? `${I("Check")}Имя сохранено` : ""}</span></div>
    </form>
    <div class="account-registration">${I("CalendarDays")}<span>Регистрация: 3 окт. 2026 г., 19:17</span></div>${M.renderAccountDanger?.() || ""}`;
  const audio = () => `${heading("Аудио", "Подготовьте звук к следующей встрече.")}
    <div class="account-audio-settings">
      <section class="account-audio-card" data-audio-card="mic" aria-labelledby="account-microphone-heading">
        <header><h3 id="account-microphone-heading">Микрофон</h3>${audioMeter("Уровень микрофона")}</header>
        <div class="account-audio-select-row">${audioSelect("mic", "Микрофон", audioInputs)}${audioTest("mic")}</div>
        <p class="account-audio-hint account-audio-test-status" role="status">Проверьте микрофон, чтобы увидеть уровень звука и названия устройств.</p>
        ${volume("microphoneVolume", "Громкость микрофона")}
        ${switchRow("autoMute", "Подключаться с выключенным микрофоном")}${switchRow("noise", "Шумоподавление")}
      </section>
      ${audioOutputCard({
        kind: "speaker",
        title: "Динамик",
        deviceKey: "speaker",
        deviceLabel: "Динамик",
        volumeLabel: "Громкость динамика",
      })}
      ${audioOutputCard({
        kind: "signals",
        title: "Звонки и уведомления",
        deviceKey: "signalOutput",
        deviceLabel: "Динамик для сигналов",
        volumeLabel: "Громкость сигналов",
        hint: "Громкость сигнала вызова и уведомлений о сообщениях, приглашениях и скором начале встречи.",
      })}
      <p class="account-audio-hint">Настройки применяются автоматически.</p>
    </div>`;
  const video = () => `${heading("Видео", "Предпросмотр доступен только вам.")}
    <div class="account-video-settings">
      <section class="account-video-card" aria-label="Параметры видео">
        <div class="account-video-preview" role="img" aria-label="Предпросмотр камеры">${I("VideoOff")}<span>Предпросмотр камеры</span></div>
        <div class="account-video-select">${select("camera", "Камера", [["default", "По умолчанию"], ["front", "Фронтальная камера"], ["back", "Основная камера"]])}</div>
        <div class="account-video-options">${switchRow("cameraOff", "Подключаться с выключенной камерой")}${switchRow("selfVideo", "Видеть себя на звонке", "Ваше видео или аватар")}${switchRow("hideVideo", "Скрыть видео участников", "Снижает нагрузку на сеть. Звук сохраняется; видео и экраны скрываются.")}</div>
      </section>
      <p class="account-video-hint">Настройки применяются автоматически.</p>
    </div>`;
  const notificationPanel = () => `${heading("Уведомления", "Выберите события и каналы доставки.")}
    <form id="account-notification-form">
      <section class="account-section"><h3>События</h3>${switchRow("invitations", "Приглашения и изменения встреч", "", s.notificationDraft)}${switchRow("reminders", "Напоминания о встречах", "", s.notificationDraft)}${switchRow("recording", "Готовность записи", "", s.notificationDraft)}</section>
      <section class="account-section"><h3>Звук уведомлений</h3>${switchRow("sound", "Звуковой сигнал", "Новые сообщения, ответы и другие уведомления.", s.notificationDraft)}<div class="account-notification-sound-controls"><button type="button" id="account-test-notification" class="button secondary" data-action="accountNotificationTest" aria-busy="false" ${s.notifications.sound ? "" : "disabled"}>${I("Volume2")}<span>Проверить звук</span></button><p class="account-notification-hint">В чатах с отключёнными уведомлениями сигнал не звучит.</p><span id="account-notification-test-status" class="account-test-status" role="status"></span></div></section>
      <section class="account-section"><h3>Каналы доставки</h3>${switchRow("email", "Email", "Получать выбранные события по электронной почте.", s.notificationDraft)}</section>
      <div class="account-save-row"><button id="account-save-notifications" class="button primary" ${notificationDirty() ? "" : "disabled"}>Сохранить настройки</button><span class="account-saved" role="status">${s.notificationSaved ? `${I("Check")}Настройки сохранены` : ""}</span></div>
    </form><p class="account-notification-hint account-notification-invitations">Личные приглашения, отправленные организатором, приходят отдельно.</p>`;
  const appearance = () => `${heading("Оформление", "Настройте MeetSpace под себя.")}
    <fieldset class="account-theme-fieldset"><legend>Тема</legend><div class="account-theme-grid">${[["light", "Светлая", "Sun"], ["dark", "Тёмная", "Moon"]].map(([key, label, icon]) => `<label class="account-theme-choice ${M.state.theme === key ? "selected" : ""}"><input type="radio" name="account-theme" value="${key}" aria-label="${label} тема" ${M.state.theme === key ? "checked" : ""}/><span class="account-theme-preview ${key}" aria-hidden="true"><i></i><span><b></b><em></em><em></em></span></span><span class="account-theme-caption">${I(icon)}<strong>${label}</strong><span class="account-radio-dot"></span></span></label>`).join("")}</div></fieldset>
    <section class="account-section"><h3>Внешний вид</h3>${select("textSize", "Размер текста", [75, 90, 100, 110, 125, 150, 200].map((n) => [String(n), `${n}%${n === 100 ? " · по умолчанию" : ""}`]))}<div class="account-type-sample"><span class="account-sample-eyebrow">ПРЕДПРОСМОТР</span><h3>Удобный размер для важных разговоров</h3><p>Все ваши встречи и сообщения — в одном месте.</p></div></section>
    ${note("Тема и размер текста в настройках применяются сразу и сохраняются на время просмотра.")}`;
  const serverAddress = () => M.state.onboarding?.server || "https://meet.example.org";
  const connectionError = (value) => {
    const clean = value.trim();
    if (!clean) return "Укажите адрес сервера.";
    if (/[\s,;]/.test(clean) || (clean.match(/https?:\/\//gi) || []).length > 1)
      return "Укажите только один адрес сервера.";
    try {
      const url = new URL(clean);
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash)
        return "Введите один адрес HTTPS без логина, пароля и параметров.";
    } catch { return "Введите адрес в формате https://meet.example.org"; }
    return "";
  };
  const normalizeConnection = (value) => new URL(value.trim()).href.replace(/\/$/, "");
  const connection = () => {
    if (s.connectionDraft === null || s.connectionOriginal !== serverAddress()) {
      s.connectionDraft = serverAddress(); s.connectionOriginal = serverAddress(); s.connectionSaved = false;
    }
    const error = connectionError(s.connectionDraft);
    return `${heading("Подключение", "Адрес сервера вашего MeetSpace.")}
      <form id="account-connection-form" class="account-form" novalidate>
        <label class="account-field"><span>Адрес сервера</span><input id="account-server-address" name="server" type="url" inputmode="url" autocomplete="url" autocapitalize="none" spellcheck="false" required maxlength="2048" placeholder="https://meet.example.org" value="${E(s.connectionDraft)}" aria-describedby="account-connection-error" aria-invalid="${Boolean(error)}"/><small id="account-connection-error" class="account-error" ${error ? "" : "hidden"}>${E(error)}</small></label>
        <div class="account-save-row"><button id="account-save-connection" class="button primary" ${error || normalizeConnection(s.connectionDraft) === normalizeConnection(serverAddress()) ? "disabled" : ""}>Сохранить адрес</button><span class="account-saved" role="status">${s.connectionSaved ? `${I("Check")}Адрес сохранён` : ""}</span></div>
      </form>${note("В макете сохраняется только адрес. Подключение к серверу не выполняется.")}`;
  };
  const panels = { profile, audio, video, notifications: notificationPanel, appearance, connection, accounts: () => M.renderAccounts(), "add-account": () => M.renderAddAccount() };
  const menu = () => `<aside class="account-sidebar" aria-label="Разделы настроек"><button class="account-identity" data-action="accountSection" data-section="accounts" aria-label="Сменить аккаунт">${portrait()}<div><strong>${E(name())}</strong><span>${E(email())}</span></div>${I("ChevronDown")}</button><p class="account-menu-label">НАСТРОЙКИ АККАУНТА</p><nav class="account-menu" aria-label="Настройки аккаунта">${sections.map(([id, icon, label, hint]) => `<button class="account-menu-item ${(s.section === id || (id === "accounts" && s.section === "add-account")) ? "active" : ""}" data-action="accountSection" data-section="${id}" aria-label="${label}" ${(s.section === id || (id === "accounts" && s.section === "add-account")) ? 'aria-current="page"' : ""}><span class="account-menu-icon">${I(icon)}</span><span><strong>${label}</strong><small>${hint}</small></span>${I("ChevronRight")}</button>`).join("")}</nav><div class="account-sidebar-footer"><button class="account-server ${s.section === "connection" ? "active" : ""}" data-action="accountSection" data-section="connection" aria-label="Подключение" ${s.section === "connection" ? 'aria-current="page"' : ""}>${I("Server")}<span><strong>Подключение</strong><small>${E(new URL(M.state.onboarding?.server || "https://meet.example.org").host)}</small></span>${I("ChevronRight")}</button><button class="account-logout" data-action="logout">${I("LogOut")}Выйти из аккаунта</button><p>MeetSpace · Демо</p></div></aside>`;
  M.screens.settings = {
    title: "Настройки аккаунта", group: "Рабочее пространство",
    render: () => M.shell(`<div class="account-layout ${s.open ? "detail-open" : ""}" style="--account-scale:${s.textSize / 100}">${menu()}<section class="account-panel" aria-labelledby="account-heading"><button class="account-back" data-action="accountBack">${I("ArrowLeft")}${s.section === "add-account" ? "Аккаунты" : "Все настройки"}</button>${panels[s.section]()}</section></div>`, "settings", "account-content"),
    bind: () => {
      const input = document.getElementById("account-name"), form = document.getElementById("account-profile-form");
      const validateName = () => {
        const clean = s.nameDraft.trim(), valid = clean.length > 0 && clean.length <= 100 && !/[\u0000-\u001f\u007f]/.test(clean);
        document.getElementById("account-save-name").disabled = !valid || clean === name();
        input.setAttribute("aria-invalid", String(!valid));
        document.getElementById("account-name-error").hidden = valid;
        return valid;
      };
      input?.addEventListener("input", () => {
        s.nameDraft = input.value; s.profileSaved = false;
        form.querySelector(".account-saved").textContent = "";
        validateName();
      });
      form?.addEventListener("submit", (e) => {
        e.preventDefault(); if (!validateName()) return;
        M.state.profileName = s.nameDraft.trim(); s.nameDraft = name(); s.profileSaved = true;
        M.state.participantName = name();
        M.render(); document.getElementById("account-name")?.focus();
      });
      const connectionForm = document.getElementById("account-connection-form");
      if (connectionForm) {
        const address = document.getElementById("account-server-address");
        const validateConnection = () => {
          const error = connectionError(s.connectionDraft);
          const hint = document.getElementById("account-connection-error");
          hint.textContent = error; hint.hidden = !error;
          address.setAttribute("aria-invalid", String(Boolean(error)));
          document.getElementById("account-save-connection").disabled = Boolean(error) || normalizeConnection(s.connectionDraft) === normalizeConnection(serverAddress());
          return !error;
        };
        address.addEventListener("input", () => {
          s.connectionDraft = address.value; s.connectionSaved = false;
          connectionForm.querySelector(".account-saved").textContent = "";
          validateConnection();
        });
        connectionForm.addEventListener("submit", (e) => {
          e.preventDefault(); if (!validateConnection()) return;
          const value = normalizeConnection(s.connectionDraft);
          M.getOnboardingState().server = value;
          M.updateCurrentAccount?.({ server: value });
          s.connectionDraft = value; s.connectionOriginal = value; s.connectionSaved = true;
          M.render(); document.getElementById("account-server-address")?.focus();
        });
      }
      document.querySelectorAll("[data-pref]").forEach((input) => input.addEventListener("change", () => {
        const key = input.dataset.pref, value = input.type === "checkbox" ? input.checked : input.value;
        if (s.section === "notifications") {
          s.notificationDraft[key] = value;
          if (key === "sound") {
            s.notifications.sound = value;
            if (!value) stopNotificationPreview();
            else document.getElementById("account-test-notification").disabled = false;
          }
          updateNotifications();
          M.productStateChanged?.();
        }
        else {
          s[key] = key === "textSize" ? Number(value) : value;
          if (key === "textSize") { document.querySelector(".account-layout").style.setProperty("--account-scale", s.textSize / 100); }
          if (s.section === "audio") {
            input.closest("[data-audio-card]")?.querySelectorAll('[data-audio-test][aria-pressed="true"]').forEach((button) => setAudioTest(button, false));
          }
          if (["audio", "video"].includes(s.section)) M.productStateChanged?.();
        }
      }));
      document.querySelectorAll("[data-audio-volume]").forEach((input) => {
        input.addEventListener("input", () => {
          const key = input.dataset.audioVolume;
          s[key] = Math.max(0, Math.min(100, Number(input.value)));
          input.setAttribute("aria-valuetext", `${s[key]}%`);
          document.getElementById(`${input.id}-value`).textContent = `${s[key]}%`;
          const card = input.closest("[data-audio-card]");
          if (card.classList.contains("testing")) card.querySelectorAll(".account-audio-meter i").forEach((bar, i) => bar.classList.toggle("lit", i < Math.ceil(s[key] / 100 * 8)));
        });
        input.addEventListener("change", () => M.productStateChanged?.());
      });
      function updateNotifications() {
        s.notificationSaved = false;
        document.getElementById("account-save-notifications").disabled = !notificationDirty();
        document.querySelector("#account-notification-form .account-saved").textContent = "";
      }
      document.getElementById("account-notification-form")?.addEventListener("submit", (e) => {
        e.preventDefault(); s.notifications = { ...s.notificationDraft }; s.notificationSaved = true; M.render();
        document.getElementById("account-heading")?.focus();
      });
      document.querySelectorAll('[name="account-theme"]').forEach((input) => input.addEventListener("change", () => {
        M.state.theme = input.value; M.state.themeMode = input.value; M.render();
        document.querySelector(`[name="account-theme"][value="${M.state.theme}"]`)?.focus();
      }));
      M.bindAccountManager?.();
    },
  };
  const open = (section) => {
    if (!validSection(section)) return;
    s.section = section; s.open = true; M.go("settings");
    document.getElementById("account-heading")?.focus();
  };
  Object.assign(M.actions, {
    servers: () => open("connection"),
    accountSection: (button) => open(button.dataset.section),
    accountBack: () => { if (s.section === "add-account") { open("accounts"); return; } s.open = false; M.render(); document.querySelector(`[data-section="${s.section}"]`)?.focus(); },
    editProfile: () => open("profile"), appearance: () => open("appearance"),
    accountAudioTest: (button) => {
      const playing = button.getAttribute("aria-pressed") !== "true";
      setAudioTest(button, playing);
      if (playing && button.dataset.audioTest !== "mic") {
        const run = button.dataset.testRun;
        setTimeout(() => { if (button.isConnected && button.dataset.testRun === run) setAudioTest(button, false); }, 1800);
      }
    },
    accountChooseOutput: (button) => {
      const key = button.dataset.devicePref;
      if (!["speaker", "signalOutput"].includes(key)) return;
      M.modal("Устройство воспроизведения", `<div class="account-output-options">${audioOutputs.map(([value, label]) => `<button class="account-output-option" data-output-value="${value}" aria-pressed="${s[key] === value}">${I(value === "headset" || value === "bluetooth" ? "Headphones" : "Volume2")}<span>${label}</span>${s[key] === value ? I("Check") : ""}</button>`).join("")}</div>`, () => {
        document.querySelectorAll("[data-output-value]").forEach((option) => option.addEventListener("click", () => {
          s[key] = option.dataset.outputValue; M.closeModal(); M.render(); document.querySelector(`[data-pref="${key}"]`)?.focus();
        }));
      });
    },
    accountNotificationTest: (button) => {
      if (!s.notifications.sound || button.disabled) return;
      const run = ++notificationPreviewRun;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.querySelector("span").textContent = "Воспроизводится…";
      document.getElementById("account-notification-test-status").textContent = "Демонстрация проверки…";
      setTimeout(() => { if (button.isConnected && run === notificationPreviewRun) stopNotificationPreview(); }, 1800);
    },
  });
})();
