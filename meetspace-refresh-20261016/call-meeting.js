/* Interactive video meeting: messages, local attachments and recording controls. */
(() => {
  const M = window.MS;
  const E = (value) => M.escape(value);
  const I = (name) => M.icon(name);
  const sessions = new Map();
  const meetingTitle = () => M.state.meetingTitle || "Дизайн-синхронизация";
  function session() {
    const key = M.state.meetingMeta?.id || (meetingTitle() === "Дизайн-синхронизация" ? "design" : meetingTitle());
    if (!sessions.has(key)) sessions.set(key, {
      draft: "", files: [], messages: [], scroll: 0,
    });
    return sessions.get(key);
  }
  const fileSize = (size) => size < 1024 ? `${size} Б` : size < 1048576
    ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(size / 1024)} КБ`
    : `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(size / 1048576)} МБ`;
  const fileIcon = (file) => file.type?.startsWith("image/") ? "FileImage" : "FileText";
  const fileCard = (file) => `<a class="call-file-card" href="${E(file.url)}" download="${E(file.name)}" aria-label="Скачать ${E(file.name)}">
    <span class="call-file-icon">${I(fileIcon(file))}</span><span><strong>${E(file.name)}</strong><small>${fileSize(file.size)}</small></span>${I("Download")}</a>`;
  const message = (item) => `<div class="call-chat-message ${item.own ? "mine" : ""}"><div class="call-chat-bubble">
    ${item.own ? "" : `<strong class="call-chat-author">${E(item.name)}</strong>`}${item.text ? `<p>${E(item.text)}</p>` : ""}
    ${(item.files || []).map(fileCard).join("")}<small class="call-chat-time">${E(item.time)}${item.own ? I("Check") : ""}</small>
  </div></div>`;
  const initialMessages = () => [
    { name: "Мария Полякова", text: "Хорошо видно, можем начинать!", time: "10:02" },
    { name: "Анна Кузнецова", text: "Прикрепляю повестку. Здесь же можно оставить вопросы к встрече.", time: "10:05", files: [{ name: "Повестка встречи.txt", size: 452, url: "assets/meeting-agenda.txt" }] },
    { name: "Дмитрий Волков", text: "Давайте начнём со сценария первого входа.", time: "10:08" },
  ];
  const pendingFiles = () => session().files.map((file) => `<div class="call-pending-file">
    <span class="call-file-icon">${I(fileIcon(file))}</span><span><strong>${E(file.name)}</strong><small>${fileSize(file.size)}</small></span>
    <button type="button" class="icon-button" data-action="removeCallFile" data-file-id="${file.id}" aria-label="Убрать файл ${E(file.name)}">${I("X")}</button></div>`).join("");

  const panelTabs = ["chat", "participants"];
  const quickEmoji = [["😊", "Улыбка"], ["👍", "Палец вверх"], ["❤️", "Сердце"], ["👏", "Аплодисменты"], ["🎉", "Праздник"]];
  const chatContents = () => `
    <div class="call-chat-feed" tabindex="0" aria-label="Сообщения встречи"><div class="call-chat-date"><span>Сегодня</span></div><div class="call-chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Чат встречи">${[...initialMessages(), ...session().messages].map(message).join("")}</div></div>
    <form id="call-message-form" class="call-chat-composer">
      <div class="call-pending-files" aria-label="Прикреплённые файлы" ${session().files.length ? "" : "hidden"}>${pendingFiles()}</div>
      <div class="call-compose-box">
        <textarea id="call-message-input" name="message" rows="2" maxlength="4000" aria-label="Сообщение участникам" placeholder="Напишите сообщение…">${E(session().draft)}</textarea>
        <div class="call-compose-actions">
          <button class="icon-button call-attach" type="button" data-action="attachCallFile" aria-label="Прикрепить файлы">${I("Paperclip")}</button>
          <details class="call-emoji-picker"><summary class="icon-button" aria-label="Добавить эмодзи">${I("Smile")}</summary><div class="call-emoji-options" aria-label="Эмодзи">${quickEmoji.map(([emoji, label]) => `<button type="button" data-action="insertCallEmoji" data-emoji="${emoji}" aria-label="${label}">${emoji}</button>`).join("")}</div></details>
          <button class="icon-button call-send" type="submit" aria-label="Отправить сообщение" ${session().draft.trim() || session().files.length ? "" : "disabled"}>${I("Send")}</button>
        </div>
      </div>
      <input id="call-file-input" type="file" multiple hidden aria-label="Выбрать файлы для встречи"/>
    </form>`;

  M.renderMeetingChat = () => {
    const active = M.state.callPanel;
    if (!panelTabs.includes(active)) return "";
    const count = M.meetingRoom().people.length;
    const title = active === "chat" ? "Чат встречи" : "Участники встречи";
    return `<aside id="meeting-chat" class="call-side meeting-chat" aria-labelledby="meeting-chat-title">
      <header class="meeting-chat-header"><h2 id="meeting-chat-title" tabindex="-1">${title}</h2><button class="icon-button" data-action="closeCallPanel" aria-label="Закрыть панель встречи">${I("X")}</button></header>
      <div class="meeting-chat-tabs" role="tablist" aria-label="Панель встречи">${panelTabs.map((tab) => `<button id="call-panel-tab-${tab}" type="button" role="tab" data-action="selectCallPanel" data-panel="${tab}" aria-controls="call-panel-${tab}" aria-selected="${tab === active}" tabindex="${tab === active ? 0 : -1}">${tab === "chat" ? "Чат" : `Участники (${count})`}</button>`).join("")}</div>
      <div id="call-panel-chat" class="meeting-chat-pane" role="tabpanel" aria-labelledby="call-panel-tab-chat" ${active === "chat" ? "" : "hidden"}>${active === "chat" ? chatContents() : ""}</div>
      <div id="call-panel-participants" class="meeting-chat-pane call-participants-list" role="tabpanel" aria-labelledby="call-panel-tab-participants" ${active === "participants" ? "" : "hidden"}>${active === "participants" ? M.renderMeetingParticipants() : ""}</div>
    </aside>`;
  };

  function refreshFiles() {
    const pending = document.querySelector(".call-pending-files");
    if (!pending) return;
    pending.innerHTML = pendingFiles();
    pending.hidden = !session().files.length;
    document.querySelector(".call-send").disabled = !session().files.length && !session().draft.trim();
  }

  M.bindMeetingChat = () => {
    const panel = document.getElementById("meeting-chat");
    if (!panel) return;
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        const emojiPicker = panel.querySelector(".call-emoji-picker[open]");
        if (emojiPicker) {
          emojiPicker.open = false;
          emojiPicker.querySelector("summary").focus();
        } else M.actions.closeCallPanel();
        event.preventDefault();
        return;
      }
      if (!event.target.matches('[role="tab"]')) return;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const active = M.state.callPanel;
      const next = event.key === "Home" ? panelTabs[0]
        : event.key === "End" ? panelTabs.at(-1)
          : panelTabs.find((tab) => tab !== active);
      event.preventDefault();
      showPanel(next, true);
    });

    const form = panel.querySelector("form");
    if (!form) return;
    const current = session();
    const feed = panel.querySelector(".call-chat-feed");
    const input = form.elements.message;
    feed.scrollTop = current.scroll;
    feed.addEventListener("scroll", () => { current.scroll = feed.scrollTop; });
    input.addEventListener("input", () => {
      current.draft = input.value;
      form.querySelector(".call-send").disabled = !input.value.trim() && !current.files.length;
    });
    document.getElementById("call-file-input").addEventListener("change", (event) => {
      for (const file of event.target.files) current.files.push({
        id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file),
      });
      event.target.value = "";
      refreshFiles();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text && !current.files.length) return;
      const item = { name: M.state.participantName || M.state.profileName || "Александр Соколов", own: true, text,
        files: [...current.files], time: new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date()) };
      current.messages.push(item);
      panel.querySelector(".call-chat-log").insertAdjacentHTML("beforeend", message(item));
      current.draft = "";
      current.files = [];
      input.value = "";
      refreshFiles();
      feed.scrollTop = feed.scrollHeight;
      current.scroll = feed.scrollTop;
      input.focus();
    });
    input.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
        event.preventDefault(); form.requestSubmit();
      }
    });
  };

  function showPanel(tab, focusTab = false) {
    if (!panelTabs.includes(tab)) return;
    M.state.callPanel = tab;
    M.render(false);
    document.getElementById(focusTab ? `call-panel-tab-${tab}` : "meeting-chat-title")?.focus();
  }

  function togglePanel(tab) {
    if (M.state.callPanel === tab) M.actions.closeCallPanel();
    else showPanel(tab);
  }

  M.actions.closeCallPanel = () => {
    const action = M.state.callPanel === "chat" ? "callChat" : "callParticipants";
    M.state.callPanel = null;
    M.render(false);
    document.querySelector(`.call-toolbar [data-action="${action}"]`)?.focus();
  };
  M.actions.callChat = () => togglePanel("chat");
  M.actions.callParticipants = () => togglePanel("participants");
  M.actions.showCallParticipants = () => {
    M.closeModal();
    showPanel("participants");
  };
  M.actions.selectCallPanel = (button) => showPanel(button.dataset.panel, true);
  M.actions.attachCallFile = () => document.getElementById("call-file-input")?.click();
  M.actions.insertCallEmoji = (button) => {
    const input = document.getElementById("call-message-input");
    const emoji = button.dataset.emoji;
    if (!input || !quickEmoji.some(([value]) => value === emoji)) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (input.value.length - (end - start) + emoji.length > input.maxLength) return;
    input.setRangeText(emoji, start, end, "end");
    input.dispatchEvent(new Event("input"));
    button.closest("details").open = false;
    input.focus();
  };
  M.actions.removeCallFile = (button) => {
    const current = session();
    const file = current.files.find((item) => item.id === button.dataset.fileId);
    if (!file) return;
    URL.revokeObjectURL(file.url);
    current.files = current.files.filter((item) => item !== file);
    refreshFiles();
    document.querySelector(".call-attach")?.focus();
  };
})();
