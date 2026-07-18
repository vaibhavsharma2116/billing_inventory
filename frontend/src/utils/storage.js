const storage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage access error', e);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage access error', e);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage access error', e);
    }
  },
  clear: () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('localStorage access error', e);
    }
  }
};

export default storage;
