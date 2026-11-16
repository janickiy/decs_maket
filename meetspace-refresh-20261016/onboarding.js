/* MeetSpace Android design prototype. No network access or credential persistence. */
(() => {
  const M = window.MS;
  const I = (name) => M.icon(name);
  const e = (value) => M.escape(String(value ?? ""));
  const S = () =>
    M.state.onboarding ||
    (M.state.onboarding = {
      server: "https://meet.example.org",
      host: "",
      port: "22",
      username: "root",
      domain: "",
      auth: "password",
      installMode: "source",
      adminUsername: "admin",
      adminPort: "8081",
      stage: 0,
    });
  M.getOnboardingState = S;
  const logo = () =>
    '<img src="assets/brand-mark.svg" alt="" width="32" height="32"><span>MeetSpace<span class="on-logo-dot">.</span></span>';
  const demo = (text) =>
    `<div class="on-demo">${I("FlaskConical")}<span><strong>Демо-прототип</strong> · ${text || "Все проверки и результаты — пример сценария."}</span></div>`;
  const progress = (n, label = "Подключение сервера", step = "") =>
    `<div class="on-step-label"><span>${e(label)}</span><span>${step ? e(step) : `0${n} <span class="on-step-sep">/ 05</span>`}</span></div><div class="on-progress-track">${[1, 2, 3, 4, 5].map((v) => `<i class="${v <= n ? "is-done" : ""}"></i>`).join("")}</div>`;
  const marks = [
    { icon: "Video", label: "Встречи", text: "Когда важен живой разговор" },
    {
      icon: "MessageCircle",
      label: "Сообщения",
      text: "Весь контекст в одном месте",
    },
    {
      icon: "ShieldCheck",
      label: "Ваш сервер",
      text: "Ваше пространство общения",
    },
  ];
  const visual = () =>
    `<div class="on-orbit-art" aria-hidden="true"><div class="on-orbit on-orbit-one"></div><div class="on-orbit on-orbit-two"></div><div class="on-orbit on-orbit-three"></div><div class="on-orbit-line"></div><div class="on-art-label">РАБОТАЕМ ВМЕСТЕ, ГДЕ БЫ МЫ НИ БЫЛИ</div><div class="on-video-tile"><div class="on-person on-person-one"><span>АК</span><i></i></div><div class="on-person on-person-two"><span>МИ</span><i></i></div><div class="on-mini-call"><span>${I("Video")}</span><span>${I("Mic")}</span><span class="on-call-red">${I("Phone")}</span></div><span class="on-art-live"><i></i>Встреча команды</span></div><div class="on-chat-bubble">${I("MessageCircle")}<div>Хорошие идеи<br><strong>начинаются здесь.</strong></div><span>09:41</span></div><div class="on-secure-node">${I("ShieldCheck")}</div><div class="on-star-node">✦</div></div>`;
  const side = (install = false) =>
    `<aside class="on-side"><a class="on-logo" href="#welcome" data-go="welcome">${logo()}</a><div class="on-side-body"><span class="on-kicker">${install ? "ВАШ СЕРВЕР. ВАШИ ПРАВИЛА." : "БЛИЖЕ К КОМАНДЕ."}</span><h2>${install ? "Своё пространство.<br>Полный контроль." : "Быть на одной<br>волне."}</h2><p>${install ? "Подключите удалённый сервер, а мы покажем каждый шаг настройки." : "Встречи, сообщения и идеи —<br>в одном пространстве."}</p>${visual()}</div><div class="on-side-footer"><span>${I("ShieldCheck")} На вашей инфраструктуре</span><span>MeetSpace для Android</span></div></aside>`;
  const frame = (content, opts = {}) =>
    `<div class="on-layout ${opts.welcome ? "on-layout-welcome" : ""} ${opts.account ? "on-layout-account" : ""}">
      ${side(opts.install)}
      <main class="on-main">
        <div class="on-mobile-brand">
          <a class="on-logo" href="#welcome" data-go="welcome">${logo()}</a>
          ${opts.install ? "" : '<span class="on-platform">ANDROID</span>'}
        </div>
        ${opts.back ? `<button class="on-back" data-go="${opts.back}">${I("ArrowLeft")} ${opts.backLabel || "Назад"}</button>` : ""}
        <div class="on-content">${content}</div>
        ${opts.install ? "" : `<div class="on-bottom-note">${I("LockKeyhole")} Ваше общение остаётся в вашем пространстве</div>`}
      </main>
    </div>`;
  const heading = (eyebrow, title, subtitle) =>
    `<div class="on-heading"><span class="on-kicker">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>`;
  const field = (label, name, value, placeholder, other = "") =>
    `<label class="field on-field"><span>${label}</span><input name="${name}" value="${e(value)}" placeholder="${placeholder}" ${other}></label>`;
  const error = '<div class="on-form-error" role="alert" hidden></div>';
  const showError = (form, text) => {
    const node = form.querySelector(".on-form-error");
    node.textContent = text;
    node.hidden = false;
  };
  const register = (id, title, render, bind = () => {}) => {
    M.screens[id] = { title, group: "Первый запуск", render, bind };
  };

  register("welcome", "Добро пожаловать", () =>
    frame(
      `${heading("ЕДИНОЕ ПРОСТРАНСТВО", "Команда ближе.<br><span>Идей больше.</span>", 'MeetSpace — единое пространство<br class="on-desktop-br"> для встреч и общения.')}<div class="on-welcome-art">${visual()}</div><div class="on-choice-stack"><button class="on-choice on-choice-main" data-go="connect"><span class="on-choice-icon">${I("Link")}</span><span><strong>Подключиться к серверу</strong><small>У меня уже есть адрес MeetSpace</small></span>${I("ArrowUpRight")}</button><button class="on-choice" data-go="deploy"><span class="on-choice-icon">${I("Server")}</span><span><strong>Развернуть свой сервер</strong><small>Создать пространство на своём VPS</small></span>${I("ArrowUpRight")}</button></div><div class="on-feature-strip">${marks.map((x) => `<span>${I(x.icon)}${x.label}</span>`).join("")}</div><button class="on-demo-link" data-go="meetings">Посмотреть интерфейс ${I("ArrowRight")}</button>`,
      { welcome: true },
    ),
  );

  register(
    "connect",
    "Подключение к серверу",
    () =>
      frame(
        `${heading("01 / ПОДКЛЮЧЕНИЕ", "Где ваша<br>команда?", "Введите адрес сервера MeetSpace. Его можно узнать у администратора команды.")}<form id="on-connect-form" class="on-form" novalidate>${field("Адрес сервера", "server", S().server, "https://meet.example.org", 'type="url" inputmode="url" autocomplete="off" spellcheck="false" required')}<p class="on-field-hint">${I("LockKeyhole")} Защищённое подключение по HTTPS</p>${error}<div id="on-connect-result" class="on-connect-result" hidden><span class="on-success-icon">${I("Check")}</span><div><strong>Сервер найден · демо</strong><p>Пример ответа /version. Возможности сервера определяются после входа.</p></div></div><button class="button primary on-full" type="submit">Проверить адрес ${I("ArrowRight")}</button></form><div class="on-info-card">${I("Info")}<p>Каждый сервер — отдельное пространство. Аккаунт вашей команды работает на её сервере.</p></div>${demo("Проверяется формат адреса. Запрос к серверу не отправляется.")}`,
        { back: "welcome" },
      ),
    () => {
      const form = document.getElementById("on-connect-form");
      let verifiedAddress = "";
      const button = form.querySelector('button[type="submit"]');
      form.elements.server.addEventListener("input", () => {
        verifiedAddress = "";
        document.getElementById("on-connect-result").hidden = true;
        button.innerHTML = `Проверить адрес ${I("ArrowRight")}`;
      });
      form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        let url;
        try {
          url = new URL(form.elements.server.value.trim());
        } catch {
          showError(form, "Введите полный адрес: https://meet.example.org");
          return;
        }
        if (
          url.protocol !== "https:" ||
          !url.hostname.includes(".") ||
          url.username ||
          url.password
        ) {
          showError(
            form,
            "Используйте HTTPS и адрес сервера без логина или пароля.",
          );
          return;
        }
        const normalized = url.href.replace(/\/$/, "");
        if (verifiedAddress === normalized) {
          M.go("login");
          return;
        }
        S().server = normalized;
        verifiedAddress = normalized;
        form.querySelector(".on-form-error").hidden = true;
        document.getElementById("on-connect-result").hidden = false;
        button.innerHTML = `Перейти ко входу ${I("ArrowRight")}`;
      });
    },
  );

  register(
    "login",
    "Вход в пространство",
    () =>
      frame(
        `${heading("02 / ВХОД В ПРОСТРАНСТВО", "С возвращением.", "Ваша команда уже здесь.")}<div class="on-server-pill"><span>${I("Server")} ${e(new URL(S().server).hostname)}</span><button data-go="connect">Изменить</button></div><form id="on-login-form" class="on-form" novalidate>${field("Электронная почта", "email", "anna@example.org", "you@company.ru", 'type="email" autocomplete="off" required')}${field("Пароль", "password", "", "Введите demo", 'type="password" autocomplete="off" required')}<p class="on-field-hint">Для просмотра макета введите пароль <strong>demo</strong>.</p>${error}<button type="submit" class="button primary on-full">Войти в MeetSpace ${I("ArrowRight")}</button></form><button class="on-text-link" data-toast="Восстановление доступа показано как сценарий. Обратитесь к администратору вашего сервера.">Не получается войти?</button><div class="on-account-switch"><span>Нет аккаунта?</span><button data-go="register">Создать аккаунт</button></div>${demo("Вход демонстрационный. Пароль не сохраняется; профиль доступен до обновления страницы.")}`,
        { back: "connect" },
      ),
    () => {
      const form = document.getElementById("on-login-form");
      form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        if (!form.elements.email.validity.valid) {
          showError(form, "Проверьте адрес электронной почты.");
          return;
        }
        if (!form.elements.password.value) {
          showError(form, "Для демонстрации введите demo.");
          return;
        }
        M.completeAccountAuth?.({ email: form.elements.email.value.trim(), server: S().server });
        form.elements.password.value = "";
        M.toast("Демонстрационное пространство открыто");
        M.go("meetings");
      });
    },
  );

  register(
    "register",
    "Создание аккаунта",
    () => frame(
      `${heading("АККАУНТ MEETSPACE", "Создайте аккаунт.", "Для встреч и общения с вашей командой.")}
      <div class="on-server-pill"><span>${I("Server")} ${e(new URL(S().server).hostname)}</span><button data-go="connect">Изменить</button></div>
      <form id="on-register-form" class="on-form on-form-compact" novalidate>
        ${field("Имя для встреч", "name", "", "Как вас зовут", 'autocomplete="off" maxlength="100" required aria-describedby="on-register-error"')}
        ${field("Электронная почта", "email", "", "you@company.ru", 'type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="254" required aria-describedby="on-register-error"')}
        ${[ ["password", "Пароль", "Минимум 8 символов"], ["confirm", "Повторите пароль", "Ещё раз введите пароль"] ].map(([name, label, placeholder]) => `<div class="field on-field"><span><label for="on-register-${name}">${label}</label></span><div class="on-password-field"><input id="on-register-${name}" name="${name}" type="password" placeholder="${placeholder}" autocomplete="off" required aria-describedby="${name === "password" ? "on-password-hint " : ""}on-register-error"><button type="button" data-password-toggle="${name}" aria-controls="on-register-${name}" aria-label="${name === "password" ? "Показать пароль" : "Показать повтор пароля"}" aria-pressed="false">${I("Eye")}</button></div>${name === "password" ? '<small id="on-password-hint" class="on-password-hint">От 8 до 128 символов.</small>' : ""}</div>`).join("")}
        <div id="on-register-error" class="on-form-error" role="alert" hidden></div>
        <button type="submit" class="button primary on-full">Создать аккаунт ${I("ArrowRight")}</button>
      </form>
      <div class="on-account-switch"><span>Уже есть аккаунт?</span><button data-go="login">Войти</button></div>
      ${demo("Регистрация демонстрационная. Пароль не сохраняется; профиль доступен до обновления страницы.")}`,
      { back: "login", backLabel: "Ко входу", account: true },
    ),
    () => {
      const form = document.getElementById("on-register-form");
      const fail = (name, message) => {
        showError(form, message);
        form.elements[name].setAttribute("aria-invalid", "true");
        form.elements[name].focus();
      };
      form.addEventListener("input", (evt) => {
        evt.target.removeAttribute("aria-invalid");
        form.querySelector(".on-form-error").hidden = true;
      });
      form.querySelectorAll("[data-password-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
          const input = form.elements[button.dataset.passwordToggle];
          const show = input.type === "password";
          input.type = show ? "text" : "password";
          button.setAttribute("aria-pressed", String(show));
          button.setAttribute("aria-label", `${show ? "Скрыть" : "Показать"} ${input.name === "password" ? "пароль" : "повтор пароля"}`);
          button.innerHTML = I(show ? "EyeOff" : "Eye");
        });
      });
      form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        form.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
        const name = form.elements.name.value.trim();
        if (!name || Array.from(name).length > 100) return fail("name", "Введите имя от 1 до 100 символов.");
        form.elements.email.value = form.elements.email.value.trim();
        if (!form.elements.email.validity.valid || new TextEncoder().encode(form.elements.email.value).length > 254) return fail("email", "Проверьте адрес электронной почты.");
        const password = form.elements.password.value;
        if (Array.from(password).length < 8 || Array.from(password).length > 128) return fail("password", "Пароль должен содержать от 8 до 128 символов.");
        if (form.elements.confirm.value !== password) return fail("confirm", "Пароли не совпадают. Повторите пароль.");
        const accountError = M.completeAccountAuth?.({ name, email: form.elements.email.value, server: S().server }, "register");
        if (accountError) return fail("email", accountError);
        form.reset();
        M.go("meetings");
        M.toast("Демо: аккаунт создан. Добро пожаловать в MeetSpace!");
      });
    },
  );

  M.onboardingUI = { I, e, S, frame, heading, field, progress, demo, showError };
})();
