// Simple storage wrapper that works on GitHub Pages
// Uses localStorage under the hood.

export const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return { value };
    } catch (e) {
      return { value: null };
    }
  },

  async set(key, value) {
    localStorage.setItem(key, value);
    return true;
  }
};
