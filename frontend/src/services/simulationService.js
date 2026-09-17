import API, { getBaseURL } from './api';

export const simulationService = {
  start: async () => {
    const response = await API.post('/simulation/start');
    return response.data;
  },

  pause: async () => {
    const response = await API.post('/simulation/pause');
    return response.data;
  },

  reset: async () => {
    const response = await API.post('/simulation/reset');
    return response.data;
  },

  setScenario: async (scenario) => {
    const response = await API.post('/simulation/scenario', { scenario });
    return response.data;
  },

  setSpeed: async (speed) => {
    const response = await API.post('/simulation/speed', { speed });
    return response.data;
  },

  getStatus: async () => {
    const response = await API.get('/simulation/status');
    return response.data;
  },

  createWebSocket: (templeId, token) => {
    const customWs = import.meta.env.VITE_WS_URL;
    if (customWs && customWs.startsWith('ws')) {
      return new WebSocket(`${customWs}/api/simulation/ws/${templeId}?token=${token}`);
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      if (!isLocal) {
        return new WebSocket(`wss://darshanai-backend.onrender.com/api/simulation/ws/${templeId}?token=${token}`);
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/simulation/ws/${templeId}?token=${token}`;
    return new WebSocket(wsUrl);
  }
};
