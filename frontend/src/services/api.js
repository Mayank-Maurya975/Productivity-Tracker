const BASE_URL = 'https://api.example.com';

export const api = {
  get: async (endpoint) => {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    return response.json();
  },
  post: async (endpoint, data) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }
};