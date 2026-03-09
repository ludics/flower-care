// Flower Care - Main JS
(function () {
  // DOM refs
  let pendingWaterId = null;
  const flowerGrid = document.getElementById('flower-grid');
  const flowerEmpty = document.getElementById('flower-empty');
  const commentList = document.getElementById('comment-list');
  const commentEmpty = document.getElementById('comment-empty');
  const modalOverlay = document.getElementById('modal-overlay');
  const btnAddFlower = document.getElementById('btn-add-flower');
  const modalClose = document.getElementById('modal-close');
  const flowerForm = document.getElementById('flower-form');
  const flowerModalTitle = document.getElementById('flower-modal-title');
  const flowerSubmitBtn = document.getElementById('flower-submit-btn');
  const commentForm = document.getElementById('comment-form');

  // Admin DOM refs
  const btnAdminToggle = document.getElementById('btn-admin-toggle');
  const adminBadge = document.getElementById('admin-badge');
  const adminLoginOverlay = document.getElementById('admin-login-overlay');
  const adminLoginClose = document.getElementById('admin-login-close');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLoginError = document.getElementById('admin-login-error');

  // ---- Admin state ----
  let isAdmin = false;

  function setAdminMode(value) {
    isAdmin = value;
    // Toggle gear icon state
    btnAdminToggle.title = isAdmin ? '退出管理员模式' : '管理员';
    btnAdminToggle.classList.toggle('is-admin', isAdmin);
    // Show/hide admin badge
    adminBadge.style.display = isAdmin ? 'inline-block' : 'none';
    // Show/hide add flower button
    btnAddFlower.style.display = isAdmin ? 'inline-block' : 'none';
    // Re-render flowers and comments to show/hide admin controls
    loadFlowers();
    loadComments();
  }

  // ---- Admin login modal ----

  function openAdminLogin() {
    adminLoginForm.reset();
    adminLoginError.textContent = '';
    adminLoginOverlay.classList.add('active');
    document.getElementById('admin-password').focus();
  }

  function closeAdminLogin() {
    adminLoginOverlay.classList.remove('active');
  }

  btnAdminToggle.addEventListener('click', () => {
    if (isAdmin) {
      setAdminMode(false);
    } else {
      openAdminLogin();
    }
  });

  adminLoginClose.addEventListener('click', closeAdminLogin);
  adminLoginOverlay.addEventListener('click', (e) => {
    if (e.target === adminLoginOverlay) closeAdminLogin();
  });

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    adminLoginError.textContent = '';
    try {
      const result = await API.adminLogin(password);
      if (result.success) {
        closeAdminLogin();
        setAdminMode(true);
      } else {
        adminLoginError.textContent = result.error || '密码错误';
      }
    } catch {
      adminLoginError.textContent = '登录失败，请重试';
    }
  });

  // ---- Helpers ----

  function formatDateTime(date) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}`;
  }

  function relativeTime(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    const abs = formatDateTime(date);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffHour < 24) return `${diffHour} 小时前（${abs}）`;
    if (diffDay < 365) return `${diffDay} 天前（${abs}）`;
    return abs;
  }

  function wateringStatus(lastWatered, intervalDays) {
    const now = new Date();
    const last = new Date(lastWatered);
    const diffDays = (now - last) / 86400000;
    const remaining = intervalDays - diffDays;

    if (remaining > 1) {
      return { cls: 'status-ok', text: `还有 ${Math.ceil(remaining)} 天浇水` };
    } else if (remaining > 0) {
      return { cls: 'status-today', text: '今天该浇水了' };
    } else {
      const overdue = Math.floor(-remaining);
      return { cls: 'status-overdue', text: `已逾期 ${overdue > 0 ? overdue : 1} 天` };
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Flower rendering ----

  function renderFlowerCard(flower) {
    const status = wateringStatus(flower.last_watered, flower.water_interval_days);
    const photoHtml = flower.photo_path
      ? `<img class="flower-card-photo" src="${escapeHtml(flower.photo_path)}" alt="${escapeHtml(flower.name)}" />`
      : `<div class="flower-card-photo-placeholder">&#127793;</div>`;

    const adminActions = isAdmin
      ? `<button class="btn btn-edit btn-do-edit" data-id="${flower.id}">编辑</button>
         <button class="btn btn-danger btn-do-delete" data-id="${flower.id}">删除</button>`
      : '';

    const card = document.createElement('div');
    card.className = 'flower-card';
    card.dataset.id = flower.id;
    card.innerHTML = `
      ${photoHtml}
      <div class="flower-card-body">
        <div class="flower-card-name">${escapeHtml(flower.name)}</div>
        <div class="flower-card-info">每 ${flower.water_interval_days} 天浇水一次</div>
        <div class="flower-card-info">上次浇水：${relativeTime(flower.last_watered)}</div>
        <span class="status-tag ${status.cls}">${status.text}</span>
        <div class="flower-card-actions">
          <button class="btn btn-water btn-do-water" data-id="${flower.id}" data-name="${escapeHtml(flower.name)}">浇水</button>
          <button class="btn btn-history btn-do-history" data-id="${flower.id}" data-name="${escapeHtml(flower.name)}">历史</button>
          ${adminActions}
        </div>
      </div>
    `;
    return card;
  }

  async function loadFlowers() {
    const flowers = await API.getFlowers();
    flowerGrid.innerHTML = '';
    if (flowers.length === 0) {
      flowerEmpty.style.display = 'block';
    } else {
      flowerEmpty.style.display = 'none';
      flowers.forEach((f) => flowerGrid.appendChild(renderFlowerCard(f)));
    }
  }

  // ---- Comment rendering ----

  function renderComment(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.dataset.id = comment.id;

    const deleteBtn = isAdmin
      ? `<button class="btn btn-comment-delete btn-do-delete-comment" data-id="${comment.id}" title="删除评论">&times;</button>`
      : '';

    item.innerHTML = `
      <div class="comment-item-header">
        <span class="comment-nickname">${escapeHtml(comment.nickname)}</span>
        <span class="comment-time-actions">
          <span class="comment-time">${relativeTime(comment.created_at)}</span>
          ${deleteBtn}
        </span>
      </div>
      <div class="comment-content">${escapeHtml(comment.content)}</div>
    `;
    return item;
  }

  async function loadComments() {
    const comments = await API.getComments();
    commentList.innerHTML = '';
    if (comments.length === 0) {
      commentEmpty.style.display = 'block';
    } else {
      commentEmpty.style.display = 'none';
      comments.forEach((c) => commentList.appendChild(renderComment(c)));
    }
  }

  // ---- Photo mode tabs ----

  const tabUpload = document.getElementById('tab-upload');
  const tabUrl = document.getElementById('tab-url');
  const flowerPhotoFile = document.getElementById('flower-photo');
  const flowerPhotoUrl = document.getElementById('flower-photo-url');

  function setPhotoTab(mode) {
    if (mode === 'url') {
      tabUrl.classList.add('active');
      tabUpload.classList.remove('active');
      flowerPhotoFile.style.display = 'none';
      flowerPhotoUrl.style.display = 'block';
    } else {
      tabUpload.classList.add('active');
      tabUrl.classList.remove('active');
      flowerPhotoFile.style.display = 'block';
      flowerPhotoUrl.style.display = 'none';
    }
  }

  tabUpload.addEventListener('click', () => setPhotoTab('upload'));
  tabUrl.addEventListener('click', () => setPhotoTab('url'));

  // ---- Flower Modal (Add / Edit) ----

  function openFlowerModal(flower = null) {
    flowerForm.reset();
    document.getElementById('flower-edit-id').value = flower ? flower.id : '';
    flowerModalTitle.textContent = flower ? '编辑花卉' : '添加花卉';
    flowerSubmitBtn.textContent = flower ? '确认修改' : '确认添加';
    if (flower) {
      document.getElementById('flower-name').value = flower.name;
      document.getElementById('flower-interval').value = flower.water_interval_days;
      // Pre-fill photo URL if it's an external link
      if (flower.photo_path && !flower.photo_path.startsWith('/uploads/')) {
        setPhotoTab('url');
        flowerPhotoUrl.value = flower.photo_path;
      } else {
        setPhotoTab('upload');
      }
    } else {
      setPhotoTab('upload');
    }
    modalOverlay.classList.add('active');
  }

  function closeFlowerModal() {
    modalOverlay.classList.remove('active');
    flowerForm.reset();
  }

  btnAddFlower.addEventListener('click', () => openFlowerModal());
  modalClose.addEventListener('click', closeFlowerModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeFlowerModal();
  });

  // ---- Events ----

  // Add / Edit flower submit
  flowerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('flower-edit-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('flower-name').value.trim());
    formData.append('water_interval_days', document.getElementById('flower-interval').value);

    const isUrlMode = tabUrl.classList.contains('active');
    if (isUrlMode) {
      const urlVal = flowerPhotoUrl.value.trim();
      if (urlVal) formData.append('photo_url', urlVal);
    } else {
      const photoFile = flowerPhotoFile.files[0];
      if (photoFile) formData.append('photo', photoFile);
    }

    if (editId) {
      await API.updateFlower(editId, formData);
    } else {
      await API.addFlower(formData);
    }
    closeFlowerModal();
    await loadFlowers();
  });

  // Flower card event delegation (water / edit / delete)
  flowerGrid.addEventListener('click', async (e) => {
    const waterBtn = e.target.closest('.btn-do-water');
    const editBtn = e.target.closest('.btn-do-edit');
    const deleteBtn = e.target.closest('.btn-do-delete');

    if (waterBtn) {
      openWaterModal(waterBtn.dataset.id, waterBtn.dataset.name);
    }

    const historyBtn = e.target.closest('.btn-do-history');
    if (historyBtn) {
      openLogModal(historyBtn.dataset.id, historyBtn.dataset.name);
    }

    if (editBtn && isAdmin) {
      // Fetch current flower data
      const flowers = await API.getFlowers();
      const flower = flowers.find((f) => String(f.id) === String(editBtn.dataset.id));
      if (flower) openFlowerModal(flower);
    }

    if (deleteBtn && isAdmin) {
      if (confirm('确定要删除这株花卉吗？')) {
        await API.deleteFlower(deleteBtn.dataset.id);
        await loadFlowers();
      }
    }
  });

  // ---- Water modal ----

  const waterModalOverlay = document.getElementById('water-modal-overlay');
  const waterModalClose = document.getElementById('water-modal-close');
  const waterModalTitle = document.getElementById('water-modal-title');
  const waterForm = document.getElementById('water-form');
  const waterTimeInput = document.getElementById('water-time');
  const waterMoodInput = document.getElementById('water-mood');
  const btnMoodRefresh = document.getElementById('btn-mood-refresh');

  async function fetchPoetry() {
    try {
      const res = await fetch('https://v2.jinrishici.com/one.json');
      const data = await res.json();
      if (data.status === 'success') return data.data.content;
    } catch {}
    return '';
  }

  async function fillPoetryMood() {
    waterMoodInput.placeholder = '加载诗词中…';
    const verse = await fetchPoetry();
    if (verse) {
      waterMoodInput.placeholder = verse;
    } else {
      waterMoodInput.placeholder = '记录一下此刻心情…';
    }
  }

  function toLocalDatetimeValue(date) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}T${h}:${mi}`;
  }

  function openWaterModal(id, name) {
    pendingWaterId = id;
    waterModalTitle.textContent = name ? `记录浇水：${name}` : '记录浇水';
    waterTimeInput.value = toLocalDatetimeValue(new Date());
    waterTimeInput.max = toLocalDatetimeValue(new Date());
    waterMoodInput.value = '';
    fillPoetryMood();
    waterModalOverlay.classList.add('active');
  }

  function closeWaterModal() {
    waterModalOverlay.classList.remove('active');
    pendingWaterId = null;
  }

  btnMoodRefresh.addEventListener('click', fillPoetryMood);

  waterModalClose.addEventListener('click', closeWaterModal);
  waterModalOverlay.addEventListener('click', (e) => {
    if (e.target === waterModalOverlay) closeWaterModal();
  });

  waterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pendingWaterId) return;
    const id = pendingWaterId;
    const wateredAt = new Date(waterTimeInput.value).toISOString();
    // Use typed value; if empty, use placeholder (poetry) as mood
    const mood = waterMoodInput.value.trim() || waterMoodInput.placeholder || null;
    const finalMood = (mood && mood !== '加载诗词中…' && mood !== '记录一下此刻心情…') ? mood : null;
    closeWaterModal();
    await API.waterFlower(id, wateredAt, finalMood);
    await loadFlowers();
  });

  // ---- Watering history modal ----

  let logModalFlowerId = null;
  const logModalOverlay = document.getElementById('log-modal-overlay');
  const logModalClose = document.getElementById('log-modal-close');
  const logModalTitle = document.getElementById('log-modal-title');
  const logList = document.getElementById('log-list');
  const logEmpty = document.getElementById('log-empty');

  function renderLogItem(log) {
    const item = document.createElement('div');
    item.className = 'log-item';
    item.dataset.id = log.id;
    const adminBtns = isAdmin
      ? `<button class="btn btn-sm btn-edit btn-do-edit-log" data-id="${log.id}">编辑</button>
         <button class="btn btn-sm btn-danger btn-do-delete-log" data-id="${log.id}">删除</button>`
      : '';
    item.innerHTML = `
      <div class="log-item-header">
        <span class="log-flower-name">${escapeHtml(log.flower_name)}</span>
        <span class="log-item-actions">${adminBtns}</span>
      </div>
      <div class="log-time">${relativeTime(log.watered_at)}</div>
      ${log.mood ? `<div class="log-mood">${escapeHtml(log.mood)}</div>` : ''}
    `;
    return item;
  }

  async function loadLogModal() {
    const logs = await API.getWateringLogs(logModalFlowerId);
    logList.innerHTML = '';
    if (logs.length === 0) {
      logEmpty.style.display = 'block';
    } else {
      logEmpty.style.display = 'none';
      logs.forEach((l) => logList.appendChild(renderLogItem(l)));
    }
  }

  function openLogModal(flowerId = null, flowerName = null) {
    logModalFlowerId = flowerId;
    logModalTitle.textContent = flowerName ? `浇水历史：${flowerName}` : '全部浇水历史';
    logModalOverlay.classList.add('active');
    loadLogModal();
  }

  function closeLogModal() {
    logModalOverlay.classList.remove('active');
    logModalFlowerId = null;
  }

  logModalClose.addEventListener('click', closeLogModal);
  logModalOverlay.addEventListener('click', (e) => {
    if (e.target === logModalOverlay) closeLogModal();
  });

  logList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-do-edit-log');
    const deleteBtn = e.target.closest('.btn-do-delete-log');
    if (editBtn && isAdmin) {
      const logs = await API.getWateringLogs(logModalFlowerId);
      const log = logs.find((l) => String(l.id) === String(editBtn.dataset.id));
      if (log) openLogEditModal(log);
    }
    if (deleteBtn && isAdmin) {
      if (confirm('确定要删除这条浇水记录吗？')) {
        await API.deleteWateringLog(deleteBtn.dataset.id);
        await loadLogModal();
        await loadFlowers();
      }
    }
  });

  // ---- Edit watering log modal ----

  const logEditOverlay = document.getElementById('log-edit-overlay');
  const logEditClose = document.getElementById('log-edit-close');
  const logEditForm = document.getElementById('log-edit-form');
  const logEditTimeInput = document.getElementById('log-edit-time');
  const logEditMoodInput = document.getElementById('log-edit-mood');

  function openLogEditModal(log) {
    document.getElementById('log-edit-id').value = log.id;
    logEditTimeInput.value = toLocalDatetimeValue(new Date(log.watered_at));
    logEditMoodInput.value = log.mood || '';
    logEditOverlay.classList.add('active');
  }

  function closeLogEditModal() {
    logEditOverlay.classList.remove('active');
  }

  logEditClose.addEventListener('click', closeLogEditModal);
  logEditOverlay.addEventListener('click', (e) => {
    if (e.target === logEditOverlay) closeLogEditModal();
  });

  logEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('log-edit-id').value;
    const wateredAt = new Date(logEditTimeInput.value).toISOString();
    const mood = logEditMoodInput.value.trim() || null;
    closeLogEditModal();
    await API.updateWateringLog(id, { watered_at: wateredAt, mood });
    await loadLogModal();
    await loadFlowers();
  });

  // ---- View all logs button ----
  document.getElementById('btn-view-all-logs').addEventListener('click', () => openLogModal());

  // Comment event delegation (delete)
  commentList.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.btn-do-delete-comment');
    if (deleteBtn && isAdmin) {
      if (confirm('确定要删除这条留言吗？')) {
        await API.deleteComment(deleteBtn.dataset.id);
        await loadComments();
      }
    }
  });

  // Add comment
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = document.getElementById('comment-nickname').value.trim();
    const content = document.getElementById('comment-content').value.trim();
    if (!nickname || !content) return;

    await API.addComment(nickname, content);
    document.getElementById('comment-content').value = '';
    await loadComments();
  });

  // ---- Init ----
  loadFlowers();
  loadComments();
})();
