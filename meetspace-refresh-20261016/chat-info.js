(() => {
  'use strict';
  const M = window.MS;
  const E = value => M.escape(value ?? '');
  const I = name => M.icon(name);
  const tabs = [
    {id: 'media', label: 'Медиа', icon: 'Image', empty: 'Здесь появятся фото и видео из переписки.'},
    {id: 'files', label: 'Файлы', icon: 'FileText', empty: 'В этой переписке пока нет файлов.'},
    {id: 'links', label: 'Ссылки', icon: 'Link', empty: 'В этой переписке пока нет ссылок.'},
  ];
  const demoProfiles = {
    anna: {email: 'anna@example.org', about: 'Занимаюсь дизайном продукта и помогаю команде превращать идеи в понятные интерфейсы.'},
    max: {email: 'max@example.org'},
    maria: {email: 'maria@example.org'},
    dmitry: {email: 'dmitry@example.org'},
  };
  let selectedMember = null;
  let activeTab = 'media';
  let returnTo = {screen: 'thread', scroll: 0, listScroll: 0};
  let groupScroll = 0;

  const profile = person => person.id === 'self' ? {
    ...person, email: M.state.profileEmail || 'alex@example.org', about: M.state.profileAbout || '',
  } : {...demoProfiles[person.id], ...person};

  function avatar(person, className) {
    const content = person.id === 'self'
      ? M.profileAvatarMarkup?.(M.profileInitials?.() || person.initials)
      : M.chatAvatarMarkup?.(person);
    return `<span class="avatar ${className} ${E(person.tone)}" aria-hidden="true">${content || E(person.initials)}</span>`;
  }

  function memberCount(count) {
    const plural = new Intl.PluralRules('ru').select(count);
    return `${count} ${{one: 'участник', few: 'участника'}[plural] || 'участников'}`;
  }

  function linksIn(text) {
    const matches = (text || '').matchAll(/(?:https?:\/\/|\bwww\.)[^\s<>"'«»]+/gi);
    const links = new Map();
    for (const [match] of matches) {
      let label = match.replace(/[.,!?:;…\]}]+$/u, '');
      while (label.endsWith(')') && label.split(')').length > label.split('(').length) label = label.slice(0, -1);
      try {
        const url = new URL(/^www\./i.test(label) ? `https://${label}` : label);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
          links.set(url.href, {label, url: url.href, domain: url.hostname});
        }
      } catch { /* Ignore incomplete addresses. */ }
    }
    return [...links.values()];
  }

  function materials() {
    const media = [], files = [], links = [];
    for (const message of M.chatMaterialMessages().reverse()) {
      const origin = {messageId: message.id, meta: `${message.author} · ${message.time}`};
      for (const file of message.attachments) {
        const target = file.photo || file.type?.startsWith('video/') ? media : files;
        target.push({...file, ...origin});
      }
      for (const link of linksIn(message.text)) links.push({...link, ...origin});
    }
    return {media, files, links};
  }

  function jumpButton(item) {
    return `<button type="button" class="icon-button chat-info-jump" data-action="chatRefreshJump" data-id="${E(item.messageId)}" aria-label="Показать в переписке: ${E(item.name || item.label)}" title="Показать в переписке">${I('MessageCircle')}</button>`;
  }

  function fileRow(file) {
    return `<div class="chat-info-entry">
      <button type="button" class="chat-info-row" data-action="chatRefreshFile" data-id="${E(file.id)}">
        <span class="chat-info-row-icon">${I(file.type?.startsWith('video/') ? 'Video' : 'FileText')}</span>
        <span class="chat-info-row-copy"><strong>${E(file.name)}</strong><small>${E(file.size)} · ${E(file.meta)}</small></span>
      </button>${jumpButton(file)}
    </div>`;
  }

  function renderMaterials(tab) {
    const items = materials()[tab.id];
    if (!items.length) return `<div class="chat-info-empty">${I(tab.icon)}<p>${tab.empty}</p></div>`;
    if (tab.id === 'links') return `<div class="chat-info-list">${items.map(item => `<div class="chat-info-entry">
      <a class="chat-info-row" href="${E(item.url)}" target="_blank" rel="noopener noreferrer">
        <span class="chat-info-row-icon">${I('Link')}</span>
        <span class="chat-info-row-copy"><strong>${E(item.label)}</strong><small>${E(item.domain)} · ${E(item.meta)}</small></span>
        ${I('ArrowUpRight')}
      </a>${jumpButton(item)}
    </div>`).join('')}</div>`;
    if (tab.id === 'files') return `<div class="chat-info-list">${items.map(fileRow).join('')}</div>`;
    const photos = items.filter(item => item.photo);
    const videos = items.filter(item => !item.photo);
    return `${photos.length ? `<div class="chat-info-media">${photos.map(file => `<button type="button" class="chat-info-photo" data-action="chatRefreshFile" data-id="${E(file.id)}" aria-label="Открыть фото ${E(file.name)}" title="${E(file.name)}"><img src="${E(file.photo)}" alt="${E(file.name)}" loading="lazy"/></button>`).join('')}</div>` : ''}
      ${videos.length ? `<div class="chat-info-list">${videos.map(fileRow).join('')}</div>` : ''}`;
  }

  function materialSection(groupName) {
    const current = tabs.find(tab => tab.id === activeTab);
    return `<section class="chat-info-card" aria-label="Материалы переписки">
      ${groupName ? `<h3 class="chat-info-materials-title">Материалы группы «${E(groupName)}»</h3>` : ''}
      <div class="chat-info-tabs" role="tablist" aria-label="Материалы переписки">
        ${tabs.map(tab => `<button type="button" id="chat-info-tab-${tab.id}" role="tab" data-material="${tab.id}" aria-controls="chat-info-materials" aria-selected="${tab.id === activeTab}" tabindex="${tab.id === activeTab ? 0 : -1}">${tab.label}</button>`).join('')}
      </div>
      <div class="chat-info-panel" id="chat-info-materials" role="tabpanel" aria-labelledby="chat-info-tab-${activeTab}" tabindex="0">${renderMaterials(current)}</div>
    </section>`;
  }

  function renderMembers(group, people) {
    return `<section class="chat-info-card" aria-labelledby="chat-info-members-heading">
      <h3 class="chat-info-section-title" id="chat-info-members-heading">Участники</h3>
      <div class="chat-info-list">${people.map(person => {
        const roles = [];
        if (person.id === 'self') roles.push('Вы');
        if (person.id === group.owner) roles.push('Администратор');
        return `<button type="button" class="chat-info-row" data-action="chatInfoMember" data-id="${E(person.id)}">
          ${avatar(person, 'chat-info-member-avatar')}
          <span class="chat-info-row-copy"><strong>${E(person.name)}</strong>${roles.length ? `<small>${roles.join(' · ')}</small>` : ''}</span>
          ${I('ChevronRight')}
        </button>`;
      }).join('')}</div>
    </section>`;
  }

  function renderDetails(person, group) {
    if (group) {
      const description = (person.description || '').trim();
      return description ? `<section class="chat-info-card"><dl class="chat-info-details"><div><dt>О группе</dt><dd>${E(description)}</dd></div></dl></section>` : '';
    }
    const about = (person.about || '').trim();
    const email = (person.email || '').trim();
    return `<section class="chat-info-card" aria-label="Данные пользователя"><dl class="chat-info-details">
      <div><dt>Имя</dt><dd>${E(person.name)}</dd></div>
      ${about ? `<div><dt>О себе</dt><dd>${E(about)}</dd></div>` : ''}
      <div><dt>Email</dt><dd>${email ? `<a href="mailto:${E(encodeURIComponent(email).replace(/%40/g, '@'))}">${E(email)}</a>` : 'Не указан'}</dd></div>
    </dl></section>`;
  }

  function renderInfo() {
    const chat = M.chatContact(M.state.chat);
    const group = chat.kind === 'group';
    const members = group ? M.chatMemberDirectory().filter(person => chat.members.includes(person.id)) : [];
    const member = members.find(person => person.id === selectedMember);
    const showingGroup = group && !member;
    const person = showingGroup ? chat : profile(member || chat);
    const heading = showingGroup ? 'Информация о группе' : 'Информация о пользователе';
    const subtitle = showingGroup ? memberCount(chat.members.length) : member?.id === 'self' ? 'Вы' : member ? `Участник группы «${chat.name}»` : 'В сети';
    const backLabel = member ? 'Назад к информации о группе' : 'Назад к переписке';
    return `<section class="thread chat-info" aria-labelledby="chat-info-heading">
      <header class="chat-info-toolbar">
        <button type="button" class="icon-button" data-action="chatInfoBack" aria-label="${backLabel}" title="${backLabel}">${I('ArrowLeft')}</button>
        <h2 id="chat-info-heading" tabindex="-1">${heading}</h2>
      </header>
      <div class="chat-info-scroll"><div class="chat-info-stack">
        <section class="chat-info-profile" aria-label="${E(person.name)}">
          <div class="chat-info-identity">${avatar(person, 'chat-info-avatar')}
            <div><h3 class="chat-info-name">${E(person.name)}</h3><p class="chat-info-subtitle">${E(subtitle)}</p></div>
          </div>
          ${member ? '' : `<div class="chat-info-actions">
            <button type="button" class="button secondary" data-action="chatInfoBack">${I('MessageCircle')}${showingGroup ? 'Чат' : 'Сообщение'}</button>
            ${showingGroup ? M.renderGroupEditEntry?.(chat) || '' : `<button type="button" class="button secondary" data-action="startPersonalCall" data-contact="${E(person.id)}">${I('Phone')}Позвонить</button>`}
          </div>`}
        </section>
        ${renderDetails(person, showingGroup)}
        ${showingGroup ? renderMembers(chat, members) : ''}
        ${materialSection(member ? chat.name : '')}
      </div></div>
    </section>`;
  }

  function bindTabs() {
    const tablist = document.querySelector('.chat-info-tabs');
    const buttons = [...tablist.querySelectorAll('[role="tab"]')];
    const panel = document.getElementById('chat-info-materials');
    function select(button) {
      if (button.dataset.material === activeTab) return;
      activeTab = button.dataset.material;
      for (const tab of buttons) {
        tab.setAttribute('aria-selected', String(tab === button));
        tab.tabIndex = tab === button ? 0 : -1;
      }
      panel.setAttribute('aria-labelledby', button.id);
      panel.innerHTML = renderMaterials(tabs.find(tab => tab.id === activeTab));
    }
    tablist.addEventListener('click', event => {
      const button = event.target.closest('[role="tab"]');
      if (button) select(button);
    });
    tablist.addEventListener('keydown', event => {
      const index = buttons.indexOf(event.target);
      if (index < 0) return;
      const next = {ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: buttons.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const button = buttons[(next + buttons.length) % buttons.length];
      select(button);
      button.focus();
    });
  }

  function focusHeading() {
    document.getElementById('chat-info-heading')?.focus({preventScroll: true});
  }

  M.renderChatInfoTrigger = (chat, portrait, name, status) => {
    const label = chat.kind === 'group' ? 'Информация о группе' : 'Информация о пользователе';
    return `<button type="button" class="chat-info-trigger" data-action="chatInfo" aria-label="${label}: ${E(chat.name)}" title="${label}">${portrait}<span class="cr-contact-copy"><strong class="chat-info-contact-name">${name}</strong><small class="chat-info-contact-status">${E(status)}</small></span></button>`;
  };

  M.screens['chat-info'] = {
    title: 'Чаты',
    group: 'Рабочее пространство',
    render: () => M.renderChatLayout(renderInfo(), true),
    bind: () => { M.screens.thread.bind(); bindTabs(); },
  };

  Object.assign(M.actions, {
    chatInfo: () => {
      if (M.state.screen === 'chat-info') { focusHeading(); return; }
      if (!M.chatContact(M.state.chat)) return;
      selectedMember = null;
      activeTab = 'media';
      returnTo = {
        screen: M.state.screen === 'messages' ? 'messages' : 'thread',
        scroll: document.getElementById('thread-log')?.scrollTop || 0,
        listScroll: document.querySelector('.conversation-list')?.scrollTop || 0,
      };
      M.go('chat-info');
      document.querySelector('.conversation-list').scrollTop = returnTo.listScroll;
      focusHeading();
    },
    chatInfoMember: button => {
      const chat = M.chatContact(M.state.chat);
      if (chat?.kind !== 'group' || !chat.members.includes(button.dataset.id)) return;
      selectedMember = button.dataset.id;
      groupScroll = document.querySelector('.chat-info-scroll').scrollTop;
      M.render();
      document.querySelector('.conversation-list').scrollTop = returnTo.listScroll;
      focusHeading();
    },
    chatInfoBack: () => {
      if (selectedMember) {
        const member = selectedMember;
        selectedMember = null;
        M.render();
        document.querySelector('.chat-info-scroll').scrollTop = groupScroll;
        document.querySelector('.conversation-list').scrollTop = returnTo.listScroll;
        document.querySelector(`[data-action="chatInfoMember"][data-id="${CSS.escape(member)}"]`)?.focus({preventScroll: true});
        return;
      }
      M.go(returnTo.screen);
      const log = document.getElementById('thread-log');
      if (log) log.scrollTop = returnTo.scroll;
      const list = document.querySelector('.conversation-list');
      if (list) list.scrollTop = returnTo.listScroll;
      document.querySelector('.chat-info-trigger')?.focus({preventScroll: true});
    },
  });
})();
