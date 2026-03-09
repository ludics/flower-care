// Flower Care - Main JS
(function () {
  const flowerGrid = document.getElementById('flower-grid');
  const flowerEmpty = document.getElementById('flower-empty');
  const commentList = document.getElementById('comment-list');
  const commentEmpty = document.getElementById('comment-empty');
  const modalOverlay = document.getElementById('modal-overlay');
  const btnAddFlower = document.getElementById('btn-add-flower');
  const modalClose = document.getElementById('modal-close');
  const flowerForm = document.getElementById('flower-form');
  const commentForm = document.getElementById('comment-form');

  // ---- Helpers ----

  function relativeTime(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffHour < 24) return `${diffHour} 小时前`;
    if (diffDay < 30) return `${diffDay} 天前`;
    return date.toLocaleDateString('zh-CN');
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
          <button class="btn btn-water btn-do-water" data-id="${flower.id}">浇水</button>
          <button class="btn btn-danger btn-do-delete" data-id="${flower.id}">删除</button>
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
    item.innerHTML = `
      <div class="comment-item-header">
        <span class="comment-nickname">${escapeHtml(comment.nickname)}</span>
        <span class="comment-time">${relativeTime(comment.created_at)}</span>
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

  // ---- Modal ----

  function openModal() {
    modalOverlay.classList.add('active');
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    flowerForm.reset();
  }

  btnAddFlower.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // ---- Events ----

  // Add flower
  flowerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', document.getElementById('flower-name').value.trim());
    formData.append('water_interval_days', document.getElementById('flower-interval').value);
    const photoFile = document.getElementById('flower-photo').files[0];
    if (photoFile) formData.append('photo', photoFile);

    await API.addFlower(formData);
    closeModal();
    await loadFlowers();
  });

  // Water / Delete via event delegation
  flowerGrid.addEventListener('click', async (e) => {
    const waterBtn = e.target.closest('.btn-do-water');
    const deleteBtn = e.target.closest('.btn-do-delete');

    if (waterBtn) {
      await API.waterFlower(waterBtn.dataset.id);
      await loadFlowers();
    }

    if (deleteBtn) {
      if (confirm('确定要删除这株花卉吗？')) {
        await API.deleteFlower(deleteBtn.dataset.id);
        await loadFlowers();
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
