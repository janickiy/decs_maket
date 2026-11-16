/* Share the current meeting using the same demo link in the field and QR code. */
(() => {
  const M = window.MS;
  const E = (value) => M.escape(value);
  const I = (name) => M.icon(name);

  function invitationQR(link) {
    const { QrCode } = qrcodegen;
    const qr = QrCode.encodeText(link, QrCode.Ecc.MEDIUM);
    const border = 4;
    const size = qr.size + 2 * border;
    const modules = [];
    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (qr.getModule(x, y)) modules.push(`M${x + border},${y + border}h1v1h-1z`);
      }
    }
    return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR-код ссылки на встречу">
      <rect width="${size}" height="${size}" fill="#fff"/>
      <path fill="#211927" d="${modules.join("")}"/>
    </svg>`;
  }
  M.renderMeetingInviteQR = invitationQR;

  async function copyLink(link, onBlocked) {
    try {
      await navigator.clipboard.writeText(link);
      M.toast("Ссылка скопирована");
    } catch {
      onBlocked();
    }
  }

  function selectLink() {
    const input = document.getElementById("call-invite-link");
    if (!input) return;
    input.focus();
    input.select();
    M.toast("Ссылка выделена. Скопируйте её вручную.");
  }

  M.actions.callInvite = () => {
    const meeting = M.state.meetingMeta;
    const title = M.state.meetingTitle || meeting?.title || "Дизайн-синхронизация";
    const link = `https://meet.example.org/room/${encodeURIComponent(meeting?.id || "design")}`;
    const opener = M.opener;
    M.modal("Поделиться встречей", `
      <p class="call-invite-title">${E(title)}</p>
      <div class="call-invite-card">
        <section class="call-invite-link" aria-labelledby="call-invite-link-title">
          <h3 id="call-invite-link-title">Ссылка на встречу</h3>
          <p>Поделитесь ссылкой или отсканируйте QR-код, чтобы присоединиться с другого устройства.</p>
          <div class="call-invite-copy">
            <input id="call-invite-link" type="text" aria-label="Ссылка на встречу" value="${E(link)}" readonly/>
            <button type="button" id="call-invite-copy">${I("Copy")}Копировать</button>
          </div>
          <p class="call-invite-hint">По ссылке можно присоединиться без аккаунта. Адрес демонстрационный.</p>
        </section>
        <figure class="call-invite-qr">
          <div class="call-invite-code">${invitationQR(link)}</div>
          <figcaption><strong>Подключиться с телефона</strong><span>Наведите камеру на QR-код</span></figcaption>
        </figure>
      </div>
      <footer class="call-invite-footer">
        <button class="button primary" type="button" id="call-invite-people" aria-haspopup="dialog">${I("Mail")}Пригласить участников</button>
      </footer>`, () => {
      document.querySelector(".modal").classList.add("call-invite-modal");
      document.getElementById("call-invite-copy").onclick = () => copyLink(link, selectLink);
      document.getElementById("call-invite-people").onclick = () => {
        const meetingButton = M.opener;
        M.actions.wrInvite();
        M.opener = meetingButton;
        const copy = document.querySelector('#wr-invite-form [data-action="copyInvite"]');
        if (copy) {
          delete copy.dataset.action;
          copy.onclick = () => copyLink(link, () => {
            if (!copy.isConnected) return;
            M.actions.callInvite();
            selectLink();
          });
        }
      };
    });
    if (opener?.isConnected) M.opener = opener;
  };
})();
