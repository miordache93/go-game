import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NX_API_URL || 'http://localhost:8080/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
      if (this.token) {
        this.setAuthToken(this.token);
      }
    }

    // Add request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  setAuthToken(token: string) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearAuth() {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  // Auth endpoints
  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
    });
    
    if (response.data.token) {
      this.setAuthToken(response.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    
    if (response.data.token) {
      this.setAuthToken(response.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    
    return response.data;
  }

  async logout() {
    this.clearAuth();
  }

  async getProfile() {
    const response = await this.client.get('/user/profile');
    return response.data;
  }

  async updateProfile(data: { avatar?: string; bio?: string; country?: string }) {
    const response = await this.client.put('/user/profile', data);
    return response.data;
  }

  // Game endpoints
  async createGame(opponentId?: string, boardSize = 19, isRanked = false) {
    const response = await this.client.post('/game/create', {
      opponentId,
      boardSize,
      isRanked,
    });
    return response.data;
  }

  async getGame(gameId: string) {
    const response = await this.client.get(`/game/${gameId}`);
    return response.data;
  }

  async getUserGames(page = 1, limit = 10, status?: string) {
    const params: any = { page, limit };
    if (status) params.status = status;
    
    const response = await this.client.get('/game/list', { params });
    return response.data;
  }

  async getGameHistory(gameId: string) {
    const response = await this.client.get(`/game/${gameId}/history`);
    return response.data;
  }

  async resignGame(gameId: string) {
    const response = await this.client.post(`/game/${gameId}/resign`);
    return response.data;
  }

  async getUserStats(userId?: string) {
    const url = userId ? `/game/user/${userId}/stats` : '/game/user/stats';
    const response = await this.client.get(url);
    return response.data;
  }

  async getLeaderboard(limit = 100, offset = 0, timeframe = 'all') {
    const response = await this.client.get('/game/leaderboard', {
      params: { limit, offset, timeframe },
    });
    return response.data;
  }

  // Helper to save PartyKit game (called from PartyKit server)
  async savePartykitGame(gameData: any, webhookSecret: string) {
    const response = await this.client.post(
      '/game/webhook/partykit',
      gameData,
      {
        headers: {
          'x-webhook-secret': webhookSecret,
        },
      }
    );
    return response.data;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Get current user from localStorage
  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;