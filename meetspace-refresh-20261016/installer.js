/* UI prototype based on meet-space-android 55616da, with custom TLS certificate selection. No SSH or secret persistence. */
(() => {
  "use strict";
  const M = window.MS;
  const { I, e, S, heading, field, progress, demo, showError } = M.onboardingUI;
  const defaults = {
    publicIpv4: "", certificateMode: "letsencrypt", smtpEnabled: false, smtpHost: "", smtpPort: "465",
    smtpFrom: "", smtpUsername: "", smtpTls: "tls", resourceProfile: "standard", dockerAction: "install",
    accessAvailable: false, trustedEndpoint: "", trustStatus: "new", diagnosticScenario: "ready",
    hasJob: false, jobStatus: "running", stage: 0, detailsExpanded: false, planExpired: false,
    statusKnown: true, stale: false, reconnecting: false, notice: "", jobId: "demo-install-001", jobCommit: "", jobError: "", jobDiscovered: false, planCheckResult: "missing", accessUntil: 0, authScenario: "ready",
    rotatedKey: false, checking: false, checkingNext: "", checkingLabel: "", checkingAccess: false, imageStep: "download",
  };
  for (const [key, value] of Object.entries(defaults)) if (!(key in S())) S()[key] = value;
  const frame = (content, opts = {}) => M.onboardingUI.frame(content, { ...opts, install: true })
    .replace('class="on-layout ', 'class="on-layout ins-layout ')
    .replace('class="on-back"', 'class="ins-text-link"');
  const go = id => M.go(id);
  const notify = () => M.productStateChanged();
  const secretField = (name, label, hint = "") => `<div class="field on-field"><span><label for="ins-${name}">${e(label)}</label></span><div class="on-password-field"><input id="ins-${name}" name="${name}" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${e(hint)}"><button type="button" data-secret="${name}" aria-label="Показать ${e(label.toLowerCase())}" aria-controls="ins-${name}" aria-pressed="false">${I("Eye")}</button></div></div>`;
  const bindSecrets = form => form.querySelectorAll('[data-secret]').forEach(button => button.addEventListener('click', () => {
    const input = form.elements[button.dataset.secret];
    input.type = input.type === 'password' ? 'text' : 'password';
    const visible = input.type === 'text';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Скрыть' : 'Показать'} ${input.labels?.[0]?.textContent.toLowerCase() || 'пароль'}`);
    button.innerHTML = I(visible ? 'EyeOff' : 'Eye');
  }));
  const register = (id, title, render, bind = () => {}) => {
    const checking = () => S().checking && ['deploy', 'ssh-auth'].includes(id);
    M.screens[id] = { title, group: 'Первый запуск',
      render: () => { if(['deploy','fingerprint','ssh-auth','preflight','install-options'].includes(id) && !S().checking && S().accessAvailable && S().accessUntil && Date.now()>S().accessUntil){S().accessAvailable=false;S().accessUntil=0;S().notice='Срок SSH-доступа истёк (10 минут). Подтвердите доступ заново.';} return checking() ? frame(`${heading('ПРОВЕРКА СЕРВЕРА', 'Проверяем соединение.', 'Демонстрация проверки без изменений на VPS.')}<section class="ins-card ins-stack" role="status"><progress aria-label="Проверка"></progress><p>${e(S().checkingLabel)}</p><button class="button secondary wide" id="ins-cancel-check">Отменить проверку</button></section>${demo('Запросы к серверу не отправляются.')}`) : render(); },
      bind: () => checking() ? document.getElementById('ins-cancel-check').onclick = () => { S().checking=false;S().accessAvailable=false;S().notice='Проверка отменена. Данные доступа очищены.';M.render(); } : bind(),
    };
  };
  window.MSInstaller = { M, I, e, S, frame, heading, field, progress, demo, showError, secretField, bindSecrets, register, go, notify, defaults };

  const publicFields = ['server', 'host', 'port', 'username', 'domain', 'auth', 'installMode', 'adminUsername', 'adminPort', ...Object.keys(defaults)];
  const enums = { auth: ['password', 'key'], installMode: ['source', 'images'], certificateMode: ['letsencrypt', 'custom'], smtpTls: ['tls', 'starttls'], resourceProfile: ['standard', 'compact-test'], dockerAction: ['install', 'plugins', 'reuse'], trustStatus: ['new', 'changed'], diagnosticScenario: ['ready', 'compact', 'blocked', 'unknown'], jobStatus: ['running', 'cancel_requested', 'cancelled', 'needs_recovery', 'failed', 'completed'], authScenario: ['ready', 'auth-error', 'network-error'], imageStep: ['download', 'verify', 'load'], planCheckResult: ['existing', 'missing'] };
  const publicServerOrigin = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password ? url.origin : null;
    } catch { return null; }
  };
  M.installerSnapshot = () => ({ ...Object.fromEntries(publicFields.map(key => [key, S()[key]])), server: publicServerOrigin(S().server) });
  M.setInstallerSnapshot = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (!publicFields.every(key => typeof value[key] === typeof S()[key])) return false;
    if (!Object.entries(enums).every(([key, choices]) => choices.includes(value[key]))) return false;
    if (!Number.isInteger(value.stage) || value.stage < 0 || value.stage > 10) return false;
    if (!publicFields.every(key => typeof value[key] !== 'string' || value[key].length <= 1024)) return false;
    if (typeof value.server !== 'string' || publicServerOrigin(value.server) !== value.server) return false;
    const changed = publicFields.some(key => S()[key] !== value[key]);
    if (changed) publicFields.forEach(key => { S()[key] = value[key]; });
    return changed;
  };
  const alert = (text, tone = 'neutral') => `<div class="ins-alert" data-tone="${tone}">${I(tone === 'danger' ? 'ShieldAlert' : tone === 'success' ? 'CircleCheck' : 'Info')}<p>${text}</p></div>`;
  const error = '<div class="on-form-error" role="alert" hidden></div>';
  const button = (label, attrs = '', secondary = false) => `<button class="button ${secondary ? 'secondary' : 'primary'} wide" ${attrs}>${label}</button>`;
  const endpoint = () => `<p class="ins-endpoint">${e(S().host || 'VPS')}<span>SSH-порт ${e(S().port)}</span></p>`;
  const exampleHost = '78.17.198.175';
  const fp = (title, changed = S().rotatedKey, typeLabel = '') => `<section class="ins-card ins-fingerprint"><h3 class="ins-section-title">${e(title)}</h3><span class="ins-note">${e(typeLabel)}ssh-ed25519</span><code>SHA256:${changed ? 'cD9mT6sV4aP8nL2kH7rQ1wX5eF3uJ0bG6zN9iO4yK2A' : 'LyM/VhJVe5MSZAzBGijRbfwHmgggN7KiPNQrLavGadY'}</code></section>`;
  const scenarios = (content, open = false) => `<details class="ins-demo-controls" ${open ? 'open' : ''}><summary>${I('FlaskConical')} Сценарии макета</summary><div class="ins-stack">${content}<p class="ins-note">Демонстрационные данные. Подключение к VPS и установка не выполняются.</p></div></details>`;
  const notice = () => S().notice ? alert(e(S().notice), 'warning') : '';
  const normalDomain = (value, hostnameOnly = false) => {
    const raw = String(value).trim();
    // Inspect the original spelling before URL parsing can erase :443 or /./.
    const name = !hostnameOnly && /^https:\/\//i.test(raw) ? raw.slice(8).replace(/\/$/, '') : raw;
    const message = hostnameOnly ? 'Укажите hostname или IP без пути и порта.' : 'Укажите домен или HTTPS-адрес без пути, порта и параметров.';
    if (!name || name.length > 253 || name.endsWith('.') || /[\s\u0000-\u001f\u007f-\u009f/\\:@?#%\[\]$'"`()]/.test(name)) throw Error(message);
    let host;
    try {
      host = name.split(/[.\u3002\uff0e\uff61]/).map(label => {
        if (!label) throw Error();
        // A suffix keeps numeric labels from being interpreted as IPv4 by URL.
        const mapped = label.normalize('NFKC').replace(/ß/g, 'ss').replace(/ς/g, 'σ');
        if (/[.\s\u0000-\u001f\u007f-\u009f/\\:@?#%\[\]$'"`()]/.test(mapped)) throw Error();
        return /^[\x00-\x7f]+$/.test(mapped) ? mapped.toLowerCase() : new URL(`https://${mapped}.invalid`).hostname.slice(0, -8);
      }).join('.');
    } catch { throw Error(message); }
    if (host.length > 253 || !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw Error(message);
    if (!hostnameOnly && (!host.includes('.') || /^[0-9.]+$/.test(host))) throw Error('Укажите полное доменное имя для HTTPS.');
    return host;
  };
  const normalHost = value => {
    const host = value.trim();
    if (!host || host.length > 253 || /[\s\u0000-\u001f\u007f-\u009f%]/.test(host)) throw Error('Укажите IP-адрес или имя VPS без протокола и пути.');
    if (host.includes(':')) {
      try {
        const ipv6 = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
        if (!/^[0-9a-fA-F:]+$/.test(ipv6)) throw Error();
        const canonical = new URL(`http://[${ipv6}]`).hostname.slice(1, -1);
        const [left, right] = canonical.split('::'), first = left ? left.split(':') : [], last = right ? right.split(':') : [];
        const groups = right === undefined ? first : [...first, ...Array(8 - first.length - last.length).fill('0'), ...last];
        if (groups.length !== 8 || groups.slice(0, 5).every(group => group === '0') && groups[5] === 'ffff') throw Error();
        return groups.join(':');
      } catch { throw Error('Проверьте IPv6-адрес. SSH-порт указывается отдельно.'); }
    }
    if (/^[\d.]+$/.test(host)) {
      if (!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(host) || host.split('.').some(n => Number(n) > 255)) throw Error('Проверьте IPv4-адрес VPS.');
      return host;
    }
    return normalDomain(host, true);
  };
  Object.assign(window.MSInstaller, { normalDomain, normalHost, scenarios, alert, button });
  const resetAccess = () => { S().accessAvailable = false; S().accessUntil=0; S().auth = 'password'; };
  let checkGeneration = 0;
  const simulateCheck = (next, label, access = false) => {
    const generation = ++checkGeneration;
    const source = M.state.screen;
    Object.assign(S(), { checking: true, checkingNext: next, checkingLabel: label, checkingAccess: access });
    M.render();
    setTimeout(() => {
      if(generation !== checkGeneration || !S().checking) return;
      if(M.state.screen !== source){S().checking=false;notify();return;}
      S().checking=false; S().notice='';
      if(access){S().accessAvailable=true;S().accessUntil=Date.now()+600000;}
      if(S().reconnecting){S().reconnecting=false;S().stale=false;S().statusKnown=S().jobError!=='STATE_UNAVAILABLE';}
      go(next);
    }, 900);
  };
  const pendingView = () => frame(`${progress(4)}${heading('СОХРАНЁННОЕ ЗАДАНИЕ', 'Вернёмся к установке.', 'Сначала запросим состояние. Продолжение требует отдельного подтверждения.')}<div class="ins-stack"><section class="ins-card">${endpoint()}<p class="ins-note">Задание: ${e(S().jobId)}</p><p class="ins-note">Домен: ${e(S().domain)}</p><p class="ins-note">Способ: ${S().installMode==='images'?'Готовые образы':'Сборка на сервере'}</p></section>${alert('Параметры начатого задания закреплены. Закрытие экрана не останавливает установку на сервере.')}${button('Восстановить наблюдение за установкой','id="ins-restore-job"')}${S().jobStatus==='completed'?button('Открыть результат','data-go="complete"',true):''}</div>${demo('Сохранённое задание существует только в памяти макета.')}`,{back:'welcome'});
  const bindPending = () => { document.getElementById('ins-restore-job').onclick=()=>{ S().stale=true;S().reconnecting=true;resetAccess();go('ssh-auth'); }; };
  Object.assign(window.MSInstaller,{pendingView,bindPending});

  register('deploy', 'Адрес VPS', () => S().hasJob ? pendingView() : frame(`${progress(1)}${heading('СОБСТВЕННАЯ ИНФРАСТРУКТУРА', 'Начнём с сервера.', 'Нужен отдельный удалённый Linux VPS с публичным IP-адресом.')}${notice()}
    ${S().hasJob ? alert(`Сохранено задание <strong>${e(S().jobId)}</strong>. Закрытие экрана не останавливает установку на сервере.`) + button('Восстановить наблюдение за установкой', 'id="ins-restore-job"', true) : ''}
    <form id="ins-details" class="on-form" novalidate><div class="on-field-row">${field('IP-адрес или имя VPS', 'host', S().host, '203.0.113.10', 'autocomplete="off" spellcheck="false"')}${field('SSH-порт', 'port', S().port, '22', 'inputmode="numeric" maxlength="5"')}</div>${field('Домен будущего MeetSpace', 'domain', S().domain, 'meet.example.org', 'autocomplete="off" spellcheck="false"')}<p class="ins-note">Для VPS укажите IP или имя сервера. Для MeetSpace — домен или HTTPS-адрес.</p>${error}${button('Проверить ключ сервера', 'type="submit"')}<p class="ins-note">На этом шаге пароль и приватный ключ не передаются. Сначала подтвердите публичный ключ сервера по независимому источнику.</p></form>${scenarios(button('Заполнить пример', 'id="ins-fill-example" type="button"', true))}${demo('Все проверки и результаты в этом сценарии демонстрационные.')}`, { back: 'welcome' }), () => {
    if(S().hasJob){bindPending();return;}
    const form = document.getElementById('ins-details');
    document.getElementById('ins-fill-example').onclick = () => { form.elements.host.value = exampleHost; form.elements.domain.value = 'meet.example.org'; form.elements.port.value = '22'; };
    document.getElementById('ins-restore-job')?.addEventListener('click', () => { S().stale = true; S().reconnecting = true; resetAccess(); go('ssh-auth'); });
    form.onsubmit = event => {
      event.preventDefault();
      try {
        const host = normalHost(form.elements.host.value), domain = normalDomain(form.elements.domain.value), port = form.elements.port.value.trim();
        if (!/^\d{1,5}$/.test(port) || +port < 1 || +port > 65535) throw Error('SSH-порт должен быть числом от 1 до 65535.');
        const changed = S().host !== host || S().port !== port || S().domain !== domain;
        if (changed) resetAccess();
        Object.assign(S(), { host, port, domain, server: `https://${domain}`, publicIpv4: /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : '', notice: '' });
        simulateCheck(S().trustedEndpoint === `${host}:${port}` && S().trustStatus !== 'changed' ? 'ssh-auth' : 'fingerprint', 'Получаем публичный ключ сервера…');
      } catch (err) { showError(form, err.message); }
    };
  });

  register('fingerprint', 'Проверка ключа', () => {
    const changed = S().trustStatus === 'changed';
    return frame(`
      ${progress(2, 'Подключение к серверу', 'Шаг 2 из 5')}
      <div class="on-heading ins-verification-heading">
        <h1>Проверка сервера</h1>
        <p><strong>Убедитесь, что подключаетесь к нужному серверу.</strong></p>
        ${changed ? '' : '<p>При первом подключении необходимо проверить ключ безопасности сервера.</p>'}
      </div>
      <p class="ins-endpoint"><strong>Адрес сервера:</strong> ${e(S().host || exampleHost)}<span><strong>SSH-порт:</strong> ${e(S().port)}</span></p>
      <div class="ins-stack">${changed ? `
        ${alert('Ключ сервера изменился. Подключение заблокировано. Сначала выясните причину смены ключа.', 'danger')}
        ${fp('Сохранённый отпечаток', false)}
        ${fp('Новый отпечаток', true)}
        ${button('Удалить сохранённое доверие…', 'id="ins-forget-trust"', true)}
      ` : `
        <h2 class="ins-section-title">Первое подключение</h2>
        ${fp('SHA-256-хеш публичного ключа сервера', S().rotatedKey, 'Тип ключа: ')}
        <p class="ins-note">Сравните этот хеш с тем, который указан в панели управления сервером, или уточните его у администратора.</p>
        <p class="ins-note">Если значения совпадают, можно безопасно продолжить подключение.</p>
        <label class="ins-checkbox"><input type="checkbox" id="ins-trust"><span>Я проверил SHA-256-хеш ключа сервера.</span></label>
        ${button('Доверять этому ключу', 'id="ins-trust-next" disabled')}
      `}</div>
      ${scenarios(`<label class="field"><span>Состояние ключа</span><select id="ins-trust-scenario"><option value="new" ${!changed ? 'selected' : ''}>Первое подключение</option><option value="changed" ${changed ? 'selected' : ''}>Ключ изменился</option></select></label>`)}
      ${demo('Отпечатки приведены для демонстрации интерфейса.')}
    `, { back: 'deploy' });
  }, () => {
    document.getElementById('ins-trust')?.addEventListener('change', event => { document.getElementById('ins-trust-next').disabled = !event.target.checked; });
    document.getElementById('ins-trust-next')?.addEventListener('click', () => {
      const state = S();
      if (!state.host) {
        state.host = exampleHost;
        state.publicIpv4 = exampleHost;
      }
      state.trustedEndpoint = `${state.host}:${state.port}`;
      state.notice = '';
      go('ssh-auth');
    });
    document.getElementById('ins-trust-scenario').onchange = event => { S().trustStatus = event.target.value; resetAccess(); M.render(); };
    document.getElementById('ins-forget-trust')?.addEventListener('click', () => M.modal('Удалить доверие к серверу?', `<p class="ins-note">Защита от подмены для ${e(S().host)}:${e(S().port)} будет сброшена. Затем потребуется заново получить ключ и сравнить отпечаток по независимому источнику.</p><div class="ins-actions"><button class="button secondary" data-close>Отмена</button><button class="button danger" id="ins-confirm-forget">Удалить доверие</button></div>`, () => {
      document.getElementById('ins-confirm-forget').onclick = () => { S().trustedEndpoint = ''; S().trustStatus = 'new'; S().rotatedKey = true; resetAccess(); M.closeModal(); go('deploy'); };
    }));
  });

  const validUser = value => /^[a-zA-Z_][a-zA-Z0-9_.-]{0,63}$/.test(value.trim());
  const keyError = text => {
    if (!text.trim()) return 'Файл ключа пуст.';
    if (/BEGIN (RSA|EC) PRIVATE KEY/.test(text) && !/ENCRYPTED|DEK-Info/.test(text)) return '';
    if (!text.includes('-----BEGIN OPENSSH PRIVATE KEY-----')) return 'Поддерживаются OpenSSH v1 и незашифрованные RSA/EC PEM. PKCS#8, зашифрованные PEM и PuTTY не поддерживаются.';
    try {
      const data = Uint8Array.from(atob(text.split('-----BEGIN OPENSSH PRIVATE KEY-----')[1].split('-----END')[0].replace(/\s/g, '')), c => c.charCodeAt(0));
      if (new TextDecoder().decode(data.slice(0, 15)) !== 'openssh-key-v1\0') throw Error();
      let p = 15;
      const word = () => { if (p + 4 > data.length) throw Error(); const n = new DataView(data.buffer).getUint32(p); p += 4; return n; };
      const string = () => { const n = word(); if (p + n > data.length) throw Error(); const a = data.slice(p, p + n); p += n; return a; };
      const cipher = new TextDecoder().decode(string()), kdf = new TextDecoder().decode(string()), options = string();
      if (cipher === 'none' && kdf === 'none') return '';
      if (kdf !== 'bcrypt' || options.length < 8) throw Error();
      const view = new DataView(options.buffer), salt = view.getUint32(0);
      if (salt + 8 > options.length || view.getUint32(salt + 4) > 64) return 'Для OpenSSH поддерживается bcrypt не более 64 раундов.';
      return '';
    } catch { return 'Не удалось распознать OpenSSH-ключ. Выберите другой файл.'; }
  };
  Object.assign(window.MSInstaller, { validUser, keyError });
  register('ssh-auth', 'Доступ по SSH', () => frame(`${progress(3)}${heading('ДОСТУП ПО SSH', 'Доступ к серверу.', S().reconnecting ? 'Восстановите доступ, чтобы сначала проверить состояние задания.' : 'Подтвердите доступ для проверки сервера перед установкой.')}${notice()}${endpoint()}${fp('Проверенный ключ сервера')}<form id="ins-auth" class="on-form" novalidate>${S().accessAvailable ? `${alert(`Доступ пользователя <strong>${e(S().username)}</strong> уже проверен в текущем сеансе макета.`, 'success')}<button class="ins-text-link" type="button" id="ins-change-access">Изменить данные доступа</button>` : `${field('Пользователь SSH', 'username', S().username, 'root', `autocomplete="off" spellcheck="false" ${S().hasJob?'readonly':''}`)}<p class="ins-note">Учётная запись SSH может отличаться от аккаунта MeetSpace.</p><div class="on-segmented" role="group" aria-label="Способ входа по SSH"><button type="button" data-auth="password" class="${S().auth === 'password' ? 'is-active' : ''}">${I('LockKeyhole')} Пароль SSH</button><button type="button" data-auth="key" class="${S().auth === 'key' ? 'is-active' : ''}">${I('KeyRound')} Приватный ключ</button></div>${S().auth === 'key' ? `<label class="on-file-picker">${I('FileKey')}<span><strong id="ins-key-name">Выбрать файл ключа</strong><small>До 256 КиБ</small></span><input name="keyfile" type="file" aria-label="Выбрать файл ключа"></label><p class="ins-note">OpenSSH v1: без пароля или bcrypt до 64 раундов. RSA/EC PEM: только без шифрования. Зашифрованные PEM, PKCS#8 и PuTTY не поддерживаются.</p><button class="ins-text-link" type="button" id="ins-clear-key" hidden>Удалить ключ из памяти</button>${secretField('passphrase', 'Passphrase ключа (если есть)', 'Необязательно')}` : secretField('sshPassword', 'Пароль SSH', 'Для макета: demo')}`}${error}${button(S().reconnecting ? 'Проверить состояние задания' : 'Проверить сервер без изменений', 'type="submit" id="ins-auth-next"')}<p class="ins-note">SSH используется только для диагностики. Пароль не передаётся в sudo. Изменение firewall, пакетов и Docker на этом этапе не выполняется.</p></form>${scenarios(`<label class="field"><span>Проверка доступа</span><select id="ins-auth-scenario"><option value="ready">Успешно</option><option value="auth-error" ${S().authScenario==='auth-error'?'selected':''}>Неверные данные доступа</option><option value="network-error" ${S().authScenario==='network-error'?'selected':''}>Сервер недоступен</option><option value="expired">Истекли 10 минут доступа</option></select></label>`)}${demo('Используйте демонстрационные данные. Пароли и ключи не сохраняются и не отправляются.')}`, { back: 'deploy' }), () => {
    const form = document.getElementById('ins-auth'), next = document.getElementById('ins-auth-next');
    document.getElementById('ins-auth-scenario').onchange=event=>{const v=event.target.value;if(v==='expired'){resetAccess();S().notice='Срок SSH-доступа истёк (10 минут). Введите данные заново.';S().authScenario='ready';}else S().authScenario=v;M.render();};
    let keyReady = false;
    const update = () => { next.disabled = !S().accessAvailable && (!validUser(form.elements.username?.value || '') || (S().auth === 'key' ? !keyReady : !form.elements.sshPassword?.value)); };
    form.querySelectorAll('[data-auth]').forEach(b => b.onclick = () => { S().username = form.elements.username.value; S().auth = b.dataset.auth; form.reset(); M.render(); });
    document.getElementById('ins-change-access')?.addEventListener('click', () => { resetAccess(); M.render(); });
    bindSecrets(form);
    form.addEventListener('input', update);
    const clearKey = () => { keyReady = false; form.elements.keyfile.value = ''; document.getElementById('ins-key-name').textContent = 'Выбрать файл ключа'; document.getElementById('ins-clear-key').hidden = true; update(); };
    document.getElementById('ins-clear-key')?.addEventListener('click', clearKey);
    form.elements.keyfile?.addEventListener('change', async () => {
      const file = form.elements.keyfile.files[0]; keyReady = false; update();
      if (!file) return;
      if (!file.size || file.size > 256 * 1024) { showError(form, 'Выберите непустой файл ключа размером до 256 КиБ.'); return; }
      let text;try{text=await file.text();}catch{showError(form,'Не удалось прочитать файл ключа. Выберите его ещё раз.');return;} const problem = keyError(text); text = '';
      if (!form.isConnected || form.elements.keyfile.files[0] !== file) return;
      if (problem) { showError(form, problem); return; }
      keyReady = true; document.getElementById('ins-key-name').textContent = file.name; document.getElementById('ins-clear-key').hidden = false; form.querySelector('.on-form-error').hidden = true; update();
    });
    form.onsubmit = event => {
      event.preventDefault(); if (next.disabled) return;
      if(S().authScenario!=='ready'){showError(form,S().authScenario==='auth-error'?'Не удалось войти по SSH. Проверьте пользователя, пароль или ключ.':'Сервер недоступен. Проверьте адрес, SSH-порт и подключение к сети.');form.reset();keyReady=false;update();return;}
      if (!S().accessAvailable) S().username = form.elements.username.value.trim();
      form.reset(); keyReady = false;
      simulateCheck(S().reconnecting ? S().jobStatus==='completed'?'complete':'install' : 'preflight', S().reconnecting?'Проверяем состояние сохранённого задания…':'Проверяем систему, ресурсы, Docker и сеть…',true);
    };
    update();
  });

  const checks = () => {
    const scenario = S().diagnosticScenario, compact = scenario === 'compact', blocked = scenario === 'blocked', unknown = scenario === 'unknown';
    const rows = [
      ['Операционная система', blocked ? 'Ubuntu 20.04 — требуется Ubuntu 22.04 / 24.04 LTS' : 'Ubuntu 24.04 LTS · systemd', blocked ? 'blocked' : 'pass'],
      ['Архитектура', 'amd64', 'pass'], ['Процессор', compact ? '2 CPU' : '4 CPU', 'pass'], ['Оперативная память', compact ? '4 ГБ' : '8 ГБ', 'pass'], ['Свободный диск', compact ? '18 ГиБ · компактная конфигурация' : '80 ГиБ', 'pass'],
      ['Права пользователя', S().username === 'root' ? 'Вход под root. Команды выполняются с полными правами.' : 'sudo без пароля доступен', S().username === 'root' ? 'warn' : 'pass'],
      ['Docker', S().dockerAction === 'install' ? 'Не установлен. Установщик запросит разрешение.' : 'Docker установлен', S().dockerAction === 'install' ? 'warn' : 'pass'],
      ['Доступ к Docker daemon', S().dockerAction === 'install' ? 'Docker daemon отсутствует' : 'Доступ к Docker предоставляет полные права на хост', S().dockerAction === 'install' ? 'unknown' : 'warn'],
      ['Docker Compose', S().dockerAction === 'reuse' ? 'Compose доступен' : 'Требуется установка Compose', S().dockerAction === 'reuse' ? 'pass' : 'warn'],
      ['Существующая установка', blocked ? 'Найдена существующая установка MeetSpace' : 'Признаки установки не обнаружены; требуется проверка плана', blocked ? 'blocked' : 'unknown'],
      ...['80', '443', '3478', '5349', '50010'].map(port => [`TCP ${port}`, blocked && port === '443' ? 'Порт занят другим сервисом' : 'Порт свободен', blocked && port === '443' ? 'blocked' : 'pass']),
      ...['3478', '50010', '49160–49259'].map(port => [`UDP ${port}`, 'Порт / диапазон свободен', 'pass']),
      ['DNS', `A-запись ${S().domain || 'домена'} совпадает с IPv4 VPS`, 'pass'], ['TLS', 'Сертификат ещё не выпущен. Он будет настроен при установке.', 'warn'], ['Firewall', 'Проверьте правила провайдера вручную. Внешняя доступность пока неизвестна.', 'unknown'],
    ];
    return rows.map(([name, detail, level]) => [name, unknown ? 'Не удалось получить достоверные данные. Повторите диагностику.' : detail, unknown ? 'unknown' : level]);
  };
  const labels = { pass: 'PASS · пройдено', warn: 'WARN · внимание', blocked: 'BLOCKED · препятствие', unknown: 'UNKNOWN · неизвестно' };
  register('preflight', 'Диагностика VPS', () => S().hasJob ? pendingView() : frame(`${progress(4)}${heading('ПЕРЕД УСТАНОВКОЙ', S().diagnosticScenario === 'blocked' ? 'Проверим ограничения.' : 'Всё по плану.', 'Ознакомьтесь с результатами диагностики сервера.')}${endpoint()}<div class="ins-stack">${button('Подготовить план установки', 'id="ins-prepare"')}${alert('План установки ещё не создан. Изменения на сервере не выполнялись.')}${S().diagnosticScenario === 'blocked' ? alert('Обнаружены препятствия. Устраните их и повторите проверку перед установкой.', 'danger') : '<p class="ins-note">Предупреждения и неизвестные параметры требуют внимания перед установкой.</p>'}<section class="ins-card"><h2 class="ins-section-title">Проверка сервера</h2><div class="ins-check-list">${checks().map(([name, detail, level]) => `<div class="ins-check-row">${I(level === 'pass' ? 'CircleCheck' : 'Info')}<div><strong>${e(name)}</strong><p>${e(detail)}</p></div><span class="ins-status" data-level="${level}">${labels[level]}</span></div>`).join('')}</div></section>${button('Повторить проверку', 'data-go="ssh-auth"', true)}</div>${scenarios(`<label class="field"><span>Результат диагностики</span><select id="ins-diagnostics">${[['ready','Стандартный VPS'],['compact','Компактный VPS'],['blocked','Есть препятствия'],['unknown','Результат неизвестен']].map(([id,label])=>`<option value="${id}" ${S().diagnosticScenario===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>Состояние Docker</span><select id="ins-docker-state">${[['install','Docker отсутствует'],['plugins','Нет Compose / Buildx'],['reuse','Всё установлено']].map(([id,label])=>`<option value="${id}" ${S().dockerAction===id?'selected':''}>${label}</option>`).join('')}</select></label>`)}${demo('Показаны примеры результатов всех проверок Android.')}`, { back: 'ssh-auth' }), () => {
    if(S().hasJob){bindPending();return;}
    document.getElementById('ins-prepare').onclick = () => { if (S().diagnosticScenario === 'blocked') S().accessAvailable = false; S().resourceProfile = S().diagnosticScenario === 'compact' ? 'compact-test' : 'standard'; go('install-options'); };
    document.getElementById('ins-diagnostics').onchange = event => { S().diagnosticScenario = event.target.value; M.render(); };
    document.getElementById('ins-docker-state').onchange = event => { S().dockerAction = event.target.value; M.render(); };
  });

  const phases = ['Docker, Compose и Buildx', 'Проверка исходников', 'Подготовка образов', 'Конфигурация и секреты', 'База, очередь и хранилище', 'Резервная копия', 'Миграции БД', 'HTTPS и сертификат', 'Запуск MeetSpace', 'Проверка готовности'];
  const stateLabel = () => S().stale ? 'Нет свежих данных о состоянии' : ({ running: 'Установка выполняется', cancel_requested: 'Остановка запрошена', cancelled: 'Остановлено на безопасной границе', needs_recovery: 'Требуется восстановление', failed: 'Требуется восстановление', completed: 'Установка на сервере завершена' })[S().jobStatus];
  const recovery = () => ['cancelled', 'failed', 'needs_recovery'].includes(S().jobStatus);
  const phaseList = () => `<ol class="ins-phase-list">${phases.map((name,i) => { const done = i < S().stage, current = i === S().stage, status = done ? 'done' : current && S().stale ? 'stale' : current && !recovery() ? 'current' : 'pending'; return `<li data-status="${status}"><span class="ins-phase-number">${done ? I('Check') : String(i+1).padStart(2,'0')}</span><div><strong>${name}</strong><p>${done ? 'Завершено' : current && S().stale ? 'Состояние требует проверки' : current && !recovery() ? S().jobStatus==='cancel_requested' ? 'Остановка запрошена' : 'Выполняется' : 'Не подтверждено'}</p></div>${status==='current'?'<span class="ins-status">Сейчас</span>':''}</li>`; }).join('')}</ol>`;
  const reconnectButton = () => button('Подключиться снова', 'id="ins-reconnect"');
  const phaseDetail = () => S().stage === 7 ? (S().certificateMode === 'custom' ? 'Подключение вашего сертификата и проверка HTTPS' : 'Выпуск сертификата Let’s Encrypt и проверка HTTPS') : S().stage === 2 ? S().installMode==='source' ? 'Подготовка образов · backend' : ({download:'Загрузка пакета выпуска',verify:'Проверка контрольных сумм',load:'Загрузка образов в Docker'})[S().imageStep] : '';
  const progressCard = () => `<section class="ins-card ins-progress-summary" aria-live="polite"><span class="ins-status">${e(stateLabel())}</span><h2 class="ins-section-title">${S().stale ? 'Последний известный этап' : 'Текущий этап'}</h2><strong>${phases[Math.min(9,S().stage)]}</strong>${phaseDetail()?`<p class="ins-note">${phaseDetail()}</p>`:''}<div class="ins-progress-line"><progress max="10" value="${S().stage}"></progress><span>${S().stage * 10}%</span></div><p class="ins-note">Подтверждено этапов: ${S().stage} из 10${S().stale ? ' · данные требуют проверки' : ''}</p></section>`;
  const detailBlock = (complete=false) => `<details class="ins-card" id="ins-job-details" ${S().detailsExpanded?'open':''}><summary>Подробности установки</summary><div class="ins-stack"><dl class="ins-meta"><div><dt>Задание</dt><dd>${e(S().jobId)}</dd></div><div><dt>Commit</dt><dd>${e(S().jobCommit || window.MSInstaller.demoPlan().commit)} · пример</dd></div><div><dt>HTTPS-сертификат</dt><dd>${S().certificateMode==='custom'?'SSL-сертификат':'Let’s Encrypt'}</dd></div><div><dt>Способ установки</dt><dd>${S().installMode==='images'?'Готовые образы':'Сборка на сервере'}</dd></div></dl><p class="ins-note">Закрытие экрана или обрыв SSH не останавливают серверное задание. Доступ хранится только в памяти открытого мастера.</p>${complete ? '<p class="ins-note">Сервисы, версии образов, HTTPS и авторизация TURN проверены с VPS. Доступ из вашей сети будет проверен при подключении. Видеозвонок ещё не проверялся.</p>' : recovery() || S().stale ? phaseList() : ''}<h3 class="ins-section-title">Журнал этапов</h3><div class="ins-log">${phases.slice(0,S().stage).map((phase,i)=>`<p>${i+1}. ${phase} · завершено</p>`).join('')}<p>${S().jobStatus==='completed'?'':`${S().stage+1}. `}${S().jobStatus==='completed'?'Все этапы подтверждены':phases[Math.min(S().stage,9)]} · ${e(stateLabel())}</p></div></div></details>`;
  const canRefreshPlan = () => S().jobError === 'STATE_UNAVAILABLE' && S().accessAvailable;
  const planCheckScenario = () => S().jobError !== 'STATE_UNAVAILABLE' ? '' : `<label class="field"><span>Результат проверки задания</span><select id="ins-plan-check-result"><option value="missing" ${S().planCheckResult === 'missing' ? 'selected' : ''}>Задание не найдено</option><option value="existing" ${S().planCheckResult === 'existing' ? 'selected' : ''}>Сохранённое задание найдено</option></select></label>`;
  const refreshMissingPlan = () => {
    if (!canRefreshPlan()) return;
    const state = S();
    state.jobError = '';
    state.stale = false;
    state.statusKnown = true;
    if (state.planCheckResult === 'existing') {
      state.jobDiscovered = true;
      go(state.jobStatus === 'completed' ? 'complete' : 'install');
      return;
    }
    Object.assign(state, { hasJob: false, jobDiscovered: false, jobStatus: 'running', stage: 0, jobCommit: '', planExpired: false, detailsExpanded: false });
    go(window.MSInstaller.validateInstallOptions(state) ? 'install-options' : 'install-plan');
  };
  const drawProgress = () => frame(`${progress(4)}${heading('УСТАНОВКА MEETSPACE', recovery() ? 'Продолжим с этого места.' : S().stale ? 'Проверим состояние.' : 'Ваше пространство создаётся.', `${e(S().username)}@${e(S().host || 'VPS')}:${e(S().port)}`)}<div class="ins-stack">${S().jobError?alert(`${e(window.MSInstallerErrors?.[S().jobError]||'Установка требует внимания. Проверьте состояние.')}<br><code>${e(S().jobError)}</code>`,'danger'):''}${!S().statusKnown ? alert(S().accessAvailable ? 'Состояние пока неизвестно. Проверьте сервер и обновите план.' : 'Состояние пока неизвестно. Для проверки подключитесь снова.', 'warning') + (S().accessAvailable ? '' : reconnectButton()) : `${progressCard()}${S().stale ? reconnectButton() : recovery() ? `${alert('Продолжение использует прежний план и сохранённые на сервере секреты. Данные и тома не удаляются.', 'warning')}${S().accessAvailable ? button('Подтвердить продолжение', 'id="ins-resume"') : reconnectButton()}` : `${phaseList()}<p class="ins-note">Остановка произойдёт после текущей команды: сборка одного образа может занять до часа. Запущенные сервисы и данные сохранятся.</p>${button('Остановить установку на сервере', `id="ins-cancel" ${S().jobStatus==='cancel_requested'?'disabled':''}`, true)}`}`}${detailBlock()}${button('Закрыть наблюдение', 'id="ins-detach"', true)}${canRefreshPlan() ? button('Проверить сервер и обновить план', 'id="ins-refresh-plan"', true) : ''}</div>${scenarios(`${planCheckScenario()}${S().stage===2&&S().installMode==='images'?`<label class="field"><span>Подготовка готовых образов</span><select id="ins-image-step">${[['download','Загрузка пакета'],['verify','Проверка пакета'],['load','Импорт в Docker']].map(([id,label])=>`<option value="${id}" ${S().imageStep===id?'selected':''}>${label}</option>`).join('')}</select></label>`:''}${button(S().jobStatus==='cancel_requested'?'Подтвердить безопасную остановку':'Подтвердить следующий этап', 'id="ins-stage-next"', true)}<label class="field"><span>Состояние задания</span><select id="ins-job-scenario"><option value="running">Установка выполняется</option><option value="stale" ${S().stale?'selected':''}>Обрыв SSH · устаревший статус</option><option value="unknown" ${!S().statusKnown?'selected':''}>Состояние неизвестно</option>${[['needs_recovery','Требуется восстановление'],['failed','Ошибка установки'],['cancelled','Остановлено']].map(([id,label])=>`<option value="${id}" ${S().jobStatus===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>Код ошибки Android</span><select id="ins-job-error"><option value="">Без ошибки</option>${Object.entries(window.MSInstallerErrors||{}).map(([code,text])=>`<option value="${code}" ${S().jobError===code?'selected':''}>${code} · ${e(text)}</option>`).join('')}</select></label>`, true)}${demo('Этапы переключаются вручную. Серверное задание не запускается.')}`);
  const bindProgress = () => {
    S().hasJob = true;
    document.getElementById('ins-job-error').onchange = event => {
      const state = S();
      state.jobError = event.target.value;
      state.stale = false;
      state.statusKnown = state.jobError !== 'STATE_UNAVAILABLE';
      if (state.statusKnown) {
        state.jobStatus = state.jobError ? 'failed' : 'running';
        state.accessAvailable = !state.jobError;
      }
      M.render();
    };
    document.getElementById('ins-plan-check-result')?.addEventListener('change', event => {
      S().planCheckResult = event.target.value;
      notify();
    });
    document.getElementById('ins-image-step')?.addEventListener('change',event=>{S().imageStep=event.target.value;M.render();});
    document.getElementById('ins-stage-next').onclick = () => {
      if (!S().statusKnown || S().stale || recovery()) { M.toast('Сначала проверьте состояние и подтвердите продолжение.'); return; }
      if (S().jobStatus==='cancel_requested') { S().jobStatus='cancelled'; S().accessAvailable=false; M.render(); return; }
      S().stage=Math.min(10,S().stage+1);
      if(S().stage===10) { S().jobStatus='completed'; go('complete'); } else M.render();
    };
    document.getElementById('ins-cancel')?.addEventListener('click',()=>{S().jobStatus='cancel_requested';M.render();});
    document.getElementById('ins-resume')?.addEventListener('click',()=>{S().jobStatus='running';S().stale=false;S().jobError='';go('install');});
    document.getElementById('ins-reconnect')?.addEventListener('click',()=>{S().reconnecting=true;resetAccess();go('ssh-auth');});
    document.getElementById('ins-detach').onclick=()=>{S().stale=true;S().accessAvailable=false;go('deploy');};
    document.getElementById('ins-refresh-plan')?.addEventListener('click', refreshMissingPlan);
    document.getElementById('ins-job-details').ontoggle=event=>{if(S().detailsExpanded!==event.target.open){S().detailsExpanded=event.target.open;notify();}};
    document.getElementById('ins-job-scenario').onchange=event=>{
      const v=event.target.value; S().jobError='';S().stale=v==='stale';S().statusKnown=v!=='unknown';
      if(!['stale','unknown'].includes(v))S().jobStatus=v;
      if(['failed','cancelled','stale','unknown'].includes(v)) S().accessAvailable=false;
      if(v==='needs_recovery')S().accessAvailable=true;
      go('install');
    };
  };
  register('install','Установка',drawProgress,bindProgress);
  register('install-error','Восстановление установки',()=>{if(S().jobStatus==='running'){S().jobStatus='needs_recovery';S().hasJob=true;}return drawProgress();},bindProgress);
  const adminSummary = () => S().jobDiscovered ? '' : `<section class="ins-card"><h2 class="ins-section-title">${I('ShieldCheck')} Администрирование</h2><p class="ins-endpoint">https://${e(S().domain || 'meet.example.org')}:${e(S().adminPort)}</p><p>Логин: <strong>${e(S().adminUsername)}</strong></p><p class="ins-note">Откройте админку и войдите с заданным паролем. LDAP / Active Directory настраивается в разделе «Настройки». Пользовательские аккаунты создаются отдельно.</p><div class="ins-stack">${button('Открыть админку','data-toast="Демо: переход к административной панели. Сервер не развёрнут."',true)}${button('Скопировать адрес','id="ins-copy-admin"',true)}</div></section>`;
  register('complete','Пространство готово',()=>{S().stage=10;S().jobStatus='completed';S().stale=false;S().statusKnown=true;S().accessAvailable=false;S().accessUntil=0;S().jobError='';return frame(`${progress(5)}<div class="on-complete-art" aria-hidden="true"><span>${I('Check')}</span></div>${heading('ГОТОВО К ОБЩЕНИЮ','Пространство готово.','Установка на сервере завершена · пример результата.')}<div class="ins-stack"><section class="ins-card"><span class="ins-note">АДРЕС ВАШЕГО ПРОСТРАНСТВА</span><h2 class="ins-section-title">${e(S().domain || 'meet.example.org')}</h2><p class="ins-note">${S().certificateMode==='custom'?'SSL-сертификат':'Let’s Encrypt'} · HTTPS проверен с VPS · демонстрация</p></section>${adminSummary()}${button('Создать аккаунт','data-go="register"')}<div class="on-account-switch"><span>Уже есть аккаунт?</span><button data-go="login">Войти</button></div><button class="ins-text-link" id="ins-forget-job">Убрать завершённое задание с устройства</button>${detailBlock(true)}</div>${demo('Макет не разворачивает сервер. Все результаты демонстрационные.')}`);},()=>{
    document.getElementById('ins-job-details').ontoggle=event=>{if(S().detailsExpanded!==event.target.open){S().detailsExpanded=event.target.open;notify();}};
    document.getElementById('ins-copy-admin')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(`https://${S().domain||'meet.example.org'}:${S().adminPort}`);M.toast('Адрес скопирован');}catch{M.toast('Выделите адрес и скопируйте вручную');}});
    document.getElementById('ins-forget-job').onclick=()=>{S().hasJob=false;S().jobDiscovered=false;S().stage=0;S().jobStatus='running';S().stale=false;S().detailsExpanded=false;resetAccess();go('welcome');};
  });
})();
