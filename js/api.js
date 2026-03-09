// API client for Flower Care
const API = {
  async getFlowers() {
    const res = await fetch('/api/flowers');
    return res.json();
  },

  async addFlower(formData) {
    const res = await fetch('/api/flowers', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async updateFlower(id, formData) {
    const res = await fetch(`/api/flowers/${id}`, {
      method: 'PUT',
      body: formData,
    });
    return res.json();
  },

  async waterFlower(id, wateredAt = null) {
    const body = wateredAt ? { watered_at: wateredAt } : {};
    const res = await fetch(`/api/flowers/${id}/water`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async deleteFlower(id) {
    const res = await fetch(`/api/flowers/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getComments() {
    const res = await fetch('/api/comments');
    return res.json();
  },

  async addComment(nickname, content) {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, content }),
    });
    return res.json();
  },

  async deleteComment(id) {
    const res = await fetch(`/api/comments/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async adminLogin(password) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.json();
  },
};
