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

  async waterFlower(id, wateredAt = null, mood = null) {
    const body = {};
    if (wateredAt) body.watered_at = wateredAt;
    if (mood !== null) body.mood = mood;
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

  async getWateringLogs(flowerId = null) {
    const url = flowerId ? `/api/watering-logs?flower_id=${flowerId}` : '/api/watering-logs';
    const res = await fetch(url);
    return res.json();
  },

  async updateWateringLog(id, data) {
    const res = await fetch(`/api/watering-logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteWateringLog(id) {
    const res = await fetch(`/api/watering-logs/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};
