import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/') {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  async register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  }
};

// Document service
export const documentService = {
  async getDocuments(params = {}) {
    const response = await api.get('/documents', { params });
    return response.data;
  },

  async uploadFile(file, title, tags) {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tags) formData.append('tags', tags);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async addUrl(url, title, tags) {
    const response = await api.post('/documents/url', { url, title, tags });
    return response.data;
  },

  async addText(title, content, tags) {
    const response = await api.post('/documents/text', { title, content, tags });
    return response.data;
  },

  async getDocument(id) {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  async deleteDocument(id) {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  async getProcessingStatus(id) {
    const response = await api.get(`/documents/${id}/status`);
    return response.data;
  }
};

// Chat service
export const chatService = {
  async getConversations() {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  async sendQuery(message, conversationId) {
    const response = await api.post('/chat/query', { message, conversationId });
    return response.data;
  },

  async streamQuery(message, conversationId) {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, conversationId })
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response;
  }
};

// Search service
export const searchService = {
  async search(query, options = {}) {
    const response = await api.get('/search', {
      params: { q: query, ...options }
    });
    return response.data;
  },

  async semanticSearch(query, options = {}) {
    const response = await api.post('/search/semantic', { query, ...options });
    return response.data;
  }
};

export default api;