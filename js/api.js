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

  async waterFlower(id) {
    const res = await fetch(`/api/flowers/${id}/water`, {
      method: 'PUT',
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
};
