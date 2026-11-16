/* Windows desktop presentation. The original screen controllers stay intact. */
(() => {
  const M = window.MS, I = name => M.icon(name), E = text => M.escape(text);
  const desktopIcon = path => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  Object.assign(window.MeetrixIcons, {
    Maximize2: desktopIcon('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
    Minimize2: desktopIcon('<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>'),
    ChevronsUpDown: desktopIcon('<path d="m8 9 4-4 4 4m-8 6 4 4 4-4"/>'),
  });
  const destinations = [
    {screen: 'meetings', icon: 'Video', title: 'Встречи', hint: 'Создание и управление встречами', key: '1'},
    {screen: 'messages', icon: 'MessagesSquare', title: 'Чаты', hint: 'Личные и командные сообщения', key: '2'},
    {screen: 'calendar', icon: 'CalendarDays', title: 'Календарь', hint: 'Расписание вашей команды', key: '3'},
    {screen: 'recordings', icon: 'CirclePlay', title: 'Записи', hint: 'Видео, аудио и материалы встреч', key: '4'},
    {screen: 'folders', icon: 'FolderClosed', title: 'Папки', hint: 'Все материалы по проектам', key: '5'},
  ];
  const settings = [
    ['profile', 'UserRound', 'Ваш профиль'], ['accounts', 'Users', 'Аккаунты'],
    ['audio', 'Volume2', 'Аудио'], ['video', 'Video', 'Видео'],
    ['notifications', 'Bell', 'Уведомления'], ['appearance', 'SunMoon', 'Оформление'],
    ['connection', 'Server', 'Подключение'],
  ].map(([section, icon, title]) => ({screen: 'settings', section, icon, title, hint: 'Настройки аккаунта'}));
  const route = item => {
    if (item.section) M.setAccountSectionRoute(item.section);
    M.go(item.screen);
  };
  const navItem = item => `<button class="desktop-nav-item" data-go="${item.screen}" data-desktop-nav="${item.screen}" title="${item.title} · Alt+${item.key}" aria-label="${item.title}" aria-keyshortcuts="Alt+${item.key}">${I(item.icon)}<span>${item.title}</span></button>`;
  const root = document.createElement('div');
  root.id = 'desktop-root';
  root.innerHTML = `
    <header class="desktop-titlebar">
      <a class="desktop-brand" href="index.html" data-go="meetings" aria-label="MeetSpace — встречи"><img src="assets/brand-mark.svg" alt=""/><strong>MeetSpace</strong></a>
      <button class="desktop-search" data-action="desktopSearch" aria-keyshortcuts="Control+k" aria-label="Поиск по разделам">${I('Search')}<span>Поиск по MeetSpace</span><kbd>Ctrl K</kbd></button>
      <div class="desktop-title-actions"><button class="desktop-icon" data-action="desktopTheme" title="Переключить тему" aria-label="Включить тёмную тему" id="desktop-theme">${I('Moon')}</button><button class="desktop-icon" data-action="desktopHelp" aria-label="Справка и горячие клавиши" title="Справка и горячие клавиши">${I('CircleHelp')}</button><button class="desktop-icon" data-action="desktopFocus" aria-label="Развернуть рабочую область" title="Развернуть рабочую область" aria-pressed="false" id="desktop-focus">${I('Maximize2')}</button></div>
    </header>
    <div class="desktop-workspace">
      <aside class="desktop-sidebar" aria-label="Боковое меню">
        <nav class="desktop-nav" aria-label="Основная навигация">
          <section class="desktop-nav-group" aria-labelledby="desktop-workspace-heading">
            <h2 class="desktop-nav-label" id="desktop-workspace-heading">Рабочее пространство</h2>
            <div class="desktop-nav-items">${destinations.filter(item => item.screen !== 'folders').map(navItem).join('')}</div>
          </section>
          <section class="desktop-nav-group" aria-labelledby="desktop-personal-heading">
            <h2 class="desktop-nav-label" id="desktop-personal-heading">Личное пространство</h2>
            <div class="desktop-nav-items">${destinations.filter(item => item.screen === 'folders').map(navItem).join('')}</div>
          </section>
        </nav>
        <div class="desktop-sidebar-bottom">
          <button class="desktop-nav-item" data-action="desktopHelp" title="Помощь" aria-label="Помощь">${I('CircleHelp')}<span>Помощь</span></button>
          <button class="desktop-nav-item" data-go="settings" data-desktop-nav="settings" aria-label="Настройки" title="Настройки · Ctrl+,">${I('Settings')}<span>Настройки</span></button>
          <div class="desktop-profile-slot"></div>
        </div>
      </aside>
      <div class="desktop-main"></div>
    </div>
    <footer class="desktop-status"><span><i></i>Демонстрационное пространство</span><span class="desktop-status-hint">Быстрый переход <kbd>Ctrl K</kbd></span><span>MeetSpace для Windows <b>·</b> UI-прототип</span></footer>`;
  const app = document.getElementById('app');
  app.before(root);
  root.querySelector('.desktop-main').append(app);
  const originalRender = M.render;
  M.render = function (...args) {
    originalRender.apply(this, args);
    const screen = M.state.screen;
    const active = ({thread: 'messages', recording: 'recordings'})[screen] || screen;
    document.querySelectorAll('[data-desktop-nav]').forEach(button => {
      if (button.dataset.desktopNav === active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const immersive = ![...destinations.map(x => x.screen), 'thread', 'recording', 'settings'].includes(screen);
    root.classList.toggle('is-immersive', immersive);
    const themeButton = document.getElementById('desktop-theme');
    themeButton.innerHTML = I(M.state.theme === 'dark' ? 'Sun' : 'Moon');
    themeButton.setAttribute('aria-label', M.state.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    const name = M.state.profileName || 'Александр Соколов';
    root.querySelector('.desktop-profile-slot').innerHTML = `<button class="desktop-profile" data-action="desktopProfile" aria-label="Ваш профиль: ${E(name)}" title="${E(name)}"><span class="desktop-profile-avatar">${M.profileAvatarMarkup?.(M.profileInitials?.() || 'АС') || 'АС'}<i></i></span><span class="desktop-profile-copy"><strong>${E(name)}</strong><small>${E(M.state.profileEmail || 'alex@example.org')}</small></span>${I('ChevronsUpDown')}</button>`;
    const pageTitle = screen === 'settings' ? 'Настройки' : M.screens[screen]?.title || 'MeetSpace';
    document.title = `${pageTitle} · MeetSpace для Windows`;
    const settingsHeader = document.querySelector('.screen-settings .tm-heading h1');
    if (settingsHeader) settingsHeader.textContent = 'Настройки';
    if (['messages', 'thread'].includes(screen)) {
      document.querySelector('.app-header .header-actions')?.insertAdjacentHTML('afterbegin', `<button class="button primary desktop-new-chat" data-action="newChat">${I('Plus')}Новый чат</button>`);
    }
    const hint = document.querySelector('.cr-gesture-hint');
    if (hint && !document.querySelector('.cr-selecting')) hint.textContent = 'Правый клик по сообщению — действия';
    const form = document.querySelector('#message-form');
    if (form && !document.querySelector('.desktop-composer-hint')) {
      const editing = form.querySelector('textarea')?.getAttribute('aria-label') === 'Редактировать сообщение';
      form.insertAdjacentHTML('afterend', `<p class="desktop-composer-hint">Enter — ${editing ? 'сохранить' : 'отправить'} <span>·</span> Shift + Enter — новая строка</p>`);
    }
  };
  // Include the desktop navigation in the existing modal focus boundary.
  const originalModal = M.modal, originalClose = M.closeModal;
  M.modal = function (...args) { originalModal.apply(this, args); root.inert = true; };
  M.closeModal = function (...args) { root.inert = false; originalClose.apply(this, args); };
  // Message context menus use their own dialog renderer and set app.inert directly.
  new MutationObserver(() => { root.inert = app.inert; }).observe(app, {attributes: true, attributeFilter: ['inert']});

  Object.assign(M.actions, {
    desktopProfile: () => route({screen: 'settings', section: 'profile'}),
    desktopTheme: () => {
      M.state.theme = M.state.theme === 'light' ? 'dark' : 'light';
      M.state.themeMode = M.state.theme;
      // Theme changes only restyle the DOM, preserving unsent messages and forms.
      document.documentElement.dataset.theme = M.state.theme;
      const url = new URL(location.href); url.searchParams.set('theme', M.state.theme);
      history.replaceState(null, '', url);
      const button = document.getElementById('desktop-theme');
      button.innerHTML = I(M.state.theme === 'dark' ? 'Sun' : 'Moon');
      button.setAttribute('aria-label', M.state.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      document.querySelectorAll('[name="account-theme"]').forEach(input => {
        input.checked = input.value === M.state.theme;
        input.closest('.account-theme-choice').classList.toggle('selected', input.checked);
      });
    },
    desktopFocus: () => {
      const focus = root.classList.toggle('is-focused');
      const button = document.getElementById('desktop-focus');
      button.setAttribute('aria-pressed', String(focus));
      button.setAttribute('aria-label', focus ? 'Вернуть боковое меню' : 'Развернуть рабочую область');
      button.title = button.getAttribute('aria-label');
      button.innerHTML = I(focus ? 'Minimize2' : 'Maximize2');
    },
    desktopHelp: () => M.modal('Работайте в своём ритме', `<p class="desktop-help-intro">Встречи, сообщения и материалы команды в одном рабочем пространстве.</p><div class="desktop-shortcuts">${[['Ctrl + K', 'Поиск по разделам'], ['Ctrl + ,', 'Открыть настройки'], ['Alt + 1…5', 'Переключить основной раздел'], ['Enter', 'Отправить сообщение'], ['Shift + Enter', 'Новая строка в сообщении'], ['Esc', 'Закрыть диалог']].map(([key, label]) => `<div><span>${label}</span><kbd>${key}</kbd></div>`).join('')}</div><p class="desktop-help-note">Это интерактивный макет. Встречи, устройства и отправка сообщений демонстрационные. Изменения действуют до обновления страницы.</p><a class="button secondary" href="mobile.html" target="_blank" rel="noopener">Мобильная версия ${I('ArrowUpRight')}</a>`),
    desktopSearch: () => {
      M.modal('Быстрый переход', '<label class="desktop-command-search">' + I('Search') + '<input id="desktop-command-input" type="search" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="desktop-command-results" aria-label="Найти раздел" placeholder="Встречи, чаты, настройки…" autocomplete="off" /></label><div id="desktop-command-results" class="desktop-command-results" role="listbox" aria-label="Разделы"></div><div class="desktop-command-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> выбор</span><span><kbd>Enter</kbd> открыть</span><span><kbd>Esc</kbd> закрыть</span></div>', () => {
        const input = document.getElementById('desktop-command-input');
        const results = document.getElementById('desktop-command-results');
        let selected = 0, found = [];
        const update = () => {
          const query = input.value.toLocaleLowerCase('ru').trim();
          const rank = item => {
            const title = item.title.toLocaleLowerCase('ru');
            return title === query ? 0 : title.startsWith(query) ? 1 : title.includes(query) ? 2 : 3;
          };
          found = [...destinations, ...settings].filter(item => `${item.title} ${item.hint}`.toLocaleLowerCase('ru').includes(query)).sort((a, b) => rank(a) - rank(b));
          selected = 0;
          results.innerHTML = found.length ? found.map((item, i) => `<button class="desktop-command-result" role="option" id="desktop-result-${i}" aria-selected="${i === 0}" data-result="${i}" ${i === 0 ? 'data-selected="true"' : ''}>${I(item.icon)}<span><strong>${E(item.title)}</strong><small>${E(item.hint)}</small></span>${I('ArrowUpRight')}</button>`).join('') : '<p class="desktop-command-empty" role="status">Ничего не найдено. Попробуйте другое название.</p>';
          if (found.length) input.setAttribute('aria-activedescendant', 'desktop-result-0');
          else input.removeAttribute('aria-activedescendant');
        };
        input.addEventListener('input', update);
        results.addEventListener('click', event => { const button = event.target.closest('[data-result]'); if (button) route(found[Number(button.dataset.result)]); });
        input.addEventListener('keydown', event => {
          if (!found.length) return;
          if (event.key === 'Enter') { event.preventDefault(); route(found[selected]); }
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault(); selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + found.length) % found.length;
            results.querySelectorAll('button').forEach((button, index) => {
              button.toggleAttribute('data-selected', index === selected);
              button.setAttribute('aria-selected', String(index === selected));
            });
            input.setAttribute('aria-activedescendant', `desktop-result-${selected}`);
            results.children[selected].scrollIntoView({block: 'nearest'});
          }
        });
        update(); input.focus();
      });
    },
  });
  document.addEventListener('keydown', event => {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.code === 'KeyK') { event.preventDefault(); if (!document.querySelector('.modal')) M.actions.desktopSearch(); }
    if (document.querySelector('.modal')) return;
    if (modifier && event.code === 'Comma') { event.preventDefault(); M.go('settings'); }
    if (event.altKey && !modifier && !event.shiftKey && /^Digit[1-5]$/.test(event.code)) {
      event.preventDefault(); M.go(destinations[Number(event.code.slice(-1)) - 1].screen);
    }
  });
})();
