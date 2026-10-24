(() => {
  'use strict';
  const D=window.Desk,S=D.state,E=D.esc,I=D.icon,$=s=>document.querySelector(s);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const chat=id=>D.chats.find(item=>item.id===id);
  S.deletedChatIds ||= []; S.chatTrash ||= []; S.chatHistoryTrash ||= []; S.leftGroupIds ||= [];
  D.chatIsVisible=id=>!!chat(id)&&!S.deletedChatIds.includes(id)&&!(chat(id).group&&S.leftGroupIds.includes(id));
  const visible=()=>D.chats.filter(item=>D.chatIsVisible(item.id));
  let trigger=null,menuChat=null,pending=null;
  const keys=['messages','chatPins','chatDrafts','reply','replyTo','mutedChats','readChats','folders','deletedChatIds','leftGroupIds','chatTrash','chatHistoryTrash','deletedMessages','personalCall','chat','customChats'];
  function saveChange(change){
    const before=Object.fromEntries(keys.map(key=>[key,{exists:Object.hasOwn(S,key),value:S[key]===undefined?null:clone(S[key])}]));
    const definitions=clone(D.chats),account=S.accounts?.find(item=>item.id===S.activeAccountId),accountData=account?clone(account.data):null;
    change();
    if(D.save()!==false)return true;
    for(const [key,value]of Object.entries(before)){if(value.exists)S[key]=value.value;else delete S[key];}
    D.chats.splice(0,D.chats.length,...definitions);
    if(account)account.data=accountData;
    return false;
  }
  function normalize(){if(!D.chatIsVisible(S.chat)){const list=visible();S.chat=(list.find(item=>S.chatFilter==='all'||S.chatFilter==='direct'&&!item.group||S.chatFilter==='group'&&item.group||S.chatFilter==='new'&&item.unread>0)||list[0])?.id||null;}}
  function syncUrl(){const url=new URL(location.href);if(S.chat)url.searchParams.set('chat',S.chat);else url.searchParams.delete('chat');history.replaceState({},'',url.href);}
  if(S.screen==='chats'){normalize();syncUrl();}
  const baseGo=D.go,baseChats=D.screens.chats;
  D.go=screen=>{
    if(screen==='chats'&&chat(S.chat)?.group&&S.leftGroupIds.includes(S.chat)){normalize();D.toast('Вы уже покинули эту группу');}
    if(screen==='chats'&&chat(S.chat)&&S.deletedChatIds.includes(S.chat))S.deletedChatIds=S.deletedChatIds.filter(id=>id!==S.chat);
    const result=baseGo(screen);if(screen==='chats')syncUrl();return result;
  };
  D.screens.chats=()=>{normalize();return visible().length?baseChats():`${D.chatListPanel()}<section class="chat-main chat-empty-conversation">${I('MessagesSquare')}<h2>Пока нет чатов</h2><p>Начните переписку или восстановите удалённый чат из корзины.</p><button class="btn btn-primary" data-action="new-chat">${I('SquarePen')}Новый чат</button><button class="btn btn-secondary" data-action="trash">${I('RotateCcw')}Корзина</button></section>`;};
  function closeMenu(restore=false){$('#chat-header-actions-menu')?.remove();trigger?.setAttribute('aria-expanded','false');trigger?.removeAttribute('aria-controls');if(restore&&trigger?.isConnected)trigger.focus();trigger=null;menuChat=null;}
  function openMenu(button){
    if(trigger===button){closeMenu(true);return;}closeMenu();
    if(!D.chatIsVisible(S.chat))return;
    trigger=button;menuChat=S.chat;button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls','chat-header-actions-menu');
    const muted=S.mutedChats?.includes(S.chat),menu=document.createElement('div');menu.id='chat-header-actions-menu';menu.className='chat-header-actions-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Действия с чатом');
    menu.innerHTML=[['Info','information','Информация'],[muted?'Bell':'BellOff','mute',muted?'Включить уведомления':'Без уведомлений'],['FolderPlus','folder','Добавить в папку'],['Eraser','clear','Очистить историю'],['Trash2','delete','Удалить чат'],...(chat(S.chat).group?[['LogOut','leave','Покинуть группу']]:[])].map(([glyph,action,label])=>`<button role="menuitem" class="${['delete','leave'].includes(action)?'danger':''}" data-action="chat-menu-${action}" data-id="${E(S.chat)}">${I(glyph)}${label}</button>`).join('');
    document.body.append(menu);const rect=button.getBoundingClientRect();menu.style.left=Math.max(12,Math.min(innerWidth-menu.offsetWidth-12,rect.right-menu.offsetWidth))+'px';menu.style.top=Math.max(42,Math.min(innerHeight-menu.offsetHeight-12,rect.bottom+8))+'px';menu.querySelector('button')?.focus();
  }
  function validAction(button){return button.dataset.id===S.chat&&D.chatIsVisible(button.dataset.id);}
  function folderPicker(id){
    const person=chat(id);if(!person||!D.chatIsVisible(id))return;
    D.openModal('Добавить в папку',`<form id="chat-folder-form" data-chat="${E(id)}"><p class="modal-note">Выберите папки для чата «${E(person.name)}».</p><div class="chat-actions-folder-list">${S.folders.map(folder=>`<label class="chat-actions-folder-item"><input type="checkbox" name="folder" value="${E(folder.id)}" ${folder.items?.some(item=>item.kind==='chat'&&item.id===id)?'checked':''}>${I('Folder')}<span>${E(folder.name)}</span></label>`).join('')||'<p class="modal-note">У вас пока нет папок.</p>'}</div><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="chat-menu-new-folder">${I('Plus')}Новая папка</button><button type="button" class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-primary" ${S.folders.length?'':'disabled'}>Сохранить</button></div></form>`);
  }
  function confirm(kind,id){
    if(!D.chatIsVisible(id)||!['clear','delete','leave'].includes(kind)||kind==='leave'&&!chat(id).group)return;const person=chat(id);pending={kind,id};
    const label=kind==='leave'?'Покинуть группу':kind==='delete'?'Удалить чат':'Очистить историю';
    const note=kind==='leave'?'Вы выйдете из группы. Она исчезнет из списка чатов и ваших папок.':`${kind==='delete'?'Чат будет убран из списка вместе с историей сообщений.':'Все сообщения в этой переписке будут убраны. Черновик останется.'} Действие можно отменить в корзине раздела «Помощь и сочетания».`;
    D.openModal(label+'?',`<div data-chat-confirm="${kind}" data-id="${E(id)}"><p class="chat-actions-confirm-name">${E(person.name)}</p><p class="modal-note">${note}</p><div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-danger" data-action="chat-confirm-action" data-kind="${kind}" data-id="${E(id)}">${label}</button></div></div>`);
  }
  function historySnapshot(id){return {id:'chat-history-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),chatId:id,name:chat(id).name,messages:clone(S.messages[id]||[]),pins:clone(S.chatPins?.[id]||[]),messageTrash:clone((S.deletedMessages||[]).filter(message=>message.chat===id))};}
  function removeHistory(id){S.messages[id]=[];S.chatPins||={};S.chatPins[id]=[];S.deletedMessages=(S.deletedMessages||[]).filter(message=>message.chat!==id);S.reply='';S.replyTo=null;const person=chat(id);if(person)person.unread=0;S.readChats=[...new Set([...(S.readChats||[]),id])];}
  function perform(button){
    const {id,kind}=button.dataset,confirmation=$('[data-chat-confirm]');
    if(!pending||pending.id!==id||pending.kind!==kind||!validAction(button)||confirmation?.dataset.chatConfirm!==kind||confirmation?.dataset.id!==id)return;
    if(!['clear','delete','leave'].includes(kind)||kind==='leave'&&!chat(id).group)return;
    if(kind==='leave'){
      if(!saveChange(()=>{
        S.leftGroupIds=[...new Set([...S.leftGroupIds,id])];
        chat(id).unread=0;S.readChats=[...new Set([...(S.readChats||[]),id])];
        S.mutedChats=(S.mutedChats||[]).filter(value=>value!==id);
        for(const folder of S.folders)folder.items=(folder.items||[]).filter(item=>!(item.kind==='chat'&&item.id===id));
        S.reply='';S.replyTo=null;normalize();
      }))return;
      pending=null;D.clearChatContext?.();D.closeModal();D.go('chats');D.toast('Вы покинули группу');return;
    }
    const snapshot=historySnapshot(id);
    if(!saveChange(()=>{
      if(kind==='delete'){
        S.chatTrash.push({...snapshot,chat:clone(chat(id)),draft:S.chatDrafts?.[id]||'',folders:S.folders.filter(folder=>folder.items?.some(item=>item.kind==='chat'&&item.id===id)).map(folder=>folder.id),muted:!!S.mutedChats?.includes(id)});
        S.deletedChatIds=[...new Set([...S.deletedChatIds,id])];
        S.chatDrafts||={};delete S.chatDrafts[id];
        S.mutedChats=(S.mutedChats||[]).filter(value=>value!==id);
        for(const folder of S.folders)folder.items=(folder.items||[]).filter(item=>!(item.kind==='chat'&&item.id===id));
        if(S.personalCall?.chatId===id)S.personalCall={...S.personalCall,active:false,sharing:false};
      }else S.chatHistoryTrash.push(snapshot);
      removeHistory(id);if(kind==='delete')normalize();
    }))return;
    pending=null;D.clearChatContext?.();D.closeModal();
    if(kind==='delete')D.go('chats');else D.render();
    D.toast(kind==='delete'?'Чат удалён. Восстановление доступно в корзине.':'История очищена. Восстановление доступно в корзине.');
  }
  const merge=(first,second,key)=>[...new Map([...first,...second].map(item=>[key(item),item])).values()];
  function restore(kind,id){
    const list=kind==='chat'?S.chatTrash:S.chatHistoryTrash,entry=list.find(item=>item.id===id);if(!entry)return;
    if(!saveChange(()=>{
      if(kind==='chat'){
        if(!chat(entry.chatId)){D.chats.push(clone(entry.chat));S.customChats=D.chats.filter(item=>item.id.startsWith('group-')||item.id.startsWith('person-'));}
        S.deletedChatIds=S.deletedChatIds.filter(value=>value!==entry.chatId);
        S.chatDrafts||={};if(!S.chatDrafts[entry.chatId])S.chatDrafts[entry.chatId]=entry.draft||'';
        if(entry.muted)S.mutedChats=[...new Set([...(S.mutedChats||[]),entry.chatId])];
        for(const folder of S.folders)if(entry.folders?.includes(folder.id)&&!folder.items.some(item=>item.kind==='chat'&&item.id===entry.chatId))folder.items.push({kind:'chat',id:entry.chatId});
        S.chatTrash=S.chatTrash.filter(item=>item.id!==id);
      }else S.chatHistoryTrash=S.chatHistoryTrash.filter(item=>item.id!==id);
      S.messages[entry.chatId]=merge(entry.messages,S.messages[entry.chatId]||[],item=>item.id);
      S.chatPins||={};S.chatPins[entry.chatId]=[...new Set([...(entry.pins||[]),...(S.chatPins[entry.chatId]||[])])].filter(value=>S.messages[entry.chatId].some(item=>item.id===value)).slice(0,20);
      S.deletedMessages=merge(entry.messageTrash||[],S.deletedMessages||[],item=>item.chat+':'+item.id);
      if(D.chatIsVisible(entry.chatId)){S.chat=entry.chatId;S.reply='';S.replyTo=null;}
    }))return;
    D.clearChatContext?.();D.go('chats');$('#message-input')?.focus();D.toast(kind==='chat'?'Чат восстановлен':'История восстановлена');
  }
  Object.assign(D.handlers,{
    'chat-header-menu':openMenu,
    'chat-menu-information':button=>{if(!validAction(button))return;closeMenu(true);D.showChatInfo();},
    'chat-menu-mute':button=>{if(!validAction(button))return;const id=button.dataset.id;closeMenu(true);if(saveChange(()=>{S.mutedChats=S.mutedChats?.includes(id)?S.mutedChats.filter(value=>value!==id):[...(S.mutedChats||[]),id];}))D.toast(S.mutedChats.includes(id)?'Уведомления выключены':'Уведомления включены');},
    'chat-menu-folder':button=>{if(!validAction(button))return;const id=button.dataset.id;closeMenu(true);folderPicker(id);},
    'chat-menu-new-folder':()=>D.handlers['add-folder'](),
    'chat-menu-clear':button=>{if(!validAction(button))return;const id=button.dataset.id;closeMenu(true);confirm('clear',id);},
    'chat-menu-delete':button=>{if(!validAction(button))return;const id=button.dataset.id;closeMenu(true);confirm('delete',id);},
    'chat-menu-leave':button=>{if(!validAction(button)||!chat(button.dataset.id).group)return;const id=button.dataset.id;closeMenu(true);confirm('leave',id);},
    'chat-confirm-action':perform,
    'chat-restore-conversation':button=>restore('chat',button.dataset.id),
    'chat-restore-history':button=>restore('history',button.dataset.id),
    'trash':()=>{
      const items=[...(S.trash||[]).map(item=>`<button class="search-result" data-action="restore-meeting" data-id="${E(item.id)}">${I('RotateCcw')}<strong>${E(item.title)}</strong></button>`),...(S.deletedMessages||[]).map(item=>`<button class="search-result" data-action="restore-message" data-id="${E(item.id)}" data-chat="${E(item.chat)}">${I('RotateCcw')}<strong>${E(item.text)}</strong></button>`),...S.chatTrash.map(item=>`<div class="chat-trash-item"><div><strong>${E(item.name)}</strong><small>Удалённый чат · ${item.messages.length} сообщений</small></div><button class="btn btn-secondary btn-small" data-action="chat-restore-conversation" data-id="${E(item.id)}">Восстановить чат</button></div>`),...S.chatHistoryTrash.map(item=>`<div class="chat-trash-item"><div><strong>${E(item.name)}</strong><small>Очищенная история · ${item.messages.length} сообщений</small></div><button class="btn btn-secondary btn-small" data-action="chat-restore-history" data-id="${E(item.id)}">Восстановить историю</button></div>`)];
      D.openModal('Корзина',`<p class="modal-note">Удалённые элементы можно восстановить.</p><div class="chat-trash-list">${items.join('')||'<p class="muted">Корзина пуста</p>'}</div>`);
    }
  });
  document.addEventListener('submit',event=>{
    const form=event.target;if(form.id!=='chat-folder-form')return;event.preventDefault();
    const id=form.dataset.chat;if(!D.chatIsVisible(id)||id!==S.chat)return;const selected=new Set(new FormData(form).getAll('folder'));
    if(!saveChange(()=>{for(const folder of S.folders){folder.items=(folder.items||[]).filter(item=>!(item.kind==='chat'&&item.id===id));if(selected.has(folder.id))folder.items.push({kind:'chat',id});}}))return;
    D.closeModal();D.toast('Папки чата сохранены');
  });
  document.addEventListener('pointerdown',event=>{if(trigger&&!event.target.closest('#chat-header-actions-menu')&&!event.target.closest('[data-action="chat-header-menu"]'))closeMenu();});
  document.addEventListener('focusin',event=>{if(trigger&&!event.target.closest('#chat-header-actions-menu')&&event.target!==trigger)closeMenu();});
  document.addEventListener('keydown',event=>{
    const menu=$('#chat-header-actions-menu');
    if(!menu){const button=event.target.closest?.('[data-action="chat-header-menu"]');if(button&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();openMenu(button);if(event.key==='ArrowUp')$('#chat-header-actions-menu button:last-child')?.focus();}return;}
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeMenu(true);return;}
    if(event.key==='Tab'){closeMenu();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();const items=[...menu.querySelectorAll('button')],position=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(position+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
  },true);
  document.addEventListener('scroll',event=>{if(trigger&&!event.target.closest?.('#chat-header-actions-menu'))closeMenu();},true);
  window.addEventListener('resize',()=>closeMenu());document.addEventListener('desk:render',()=>closeMenu());
})();
