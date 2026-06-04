import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NX_API_URL || 'http://localhost:8080/api';

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * Normalize a user object returned by the API so the client always exposes an
 * `id` field. Mongo documents serialize as `_id`, but the rest of the app
 * (stores, components) expects `id`.
 */
function normalizeUser<T extends Record<string, any> | null | undefined>(user: T) {
  if (!user) return user;
  if (user.id || !user._id) return user;
  return { ...user, id: String(user._id) };
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
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
      (error) => Promise.reject(error)
    );

    // Add response interceptor that transparently refreshes expired tokens
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as
          | (AxiosRequestConfig & { _retry?: boolean })
          | undefined;

        const status = error.response?.status;
        const isAuthEndpoint =
          typeof originalRequest?.url === 'string' &&
          (originalRequest.url.includes('/auth/login') ||
            originalRequest.url.includes('/auth/register') ||
            originalRequest.url.includes('/auth/refresh'));

        // Attempt a single transparent refresh on 401 for non-auth requests
        if (
          status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !isAuthEndpoint &&
          this.refreshToken
        ) {
          originalRequest._retry = true;
          const newToken = await this.tryRefreshToken();
          if (newToken) {
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${newToken}`,
            };
            return this.client(originalRequest);
          }
          // Refresh failed: clear auth so the app can react (no hard redirect)
          this.clearAuth();
        } else if (status === 401 && !isAuthEndpoint) {
          this.clearAuth();
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  setAuthToken(token: string) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  setRefreshToken(token: string) {
    this.refreshToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  }

  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    delete this.client.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Exchange the stored refresh token for a new access token. De-duplicates
   * concurrent refreshes so multiple failed requests share one network call.
   */
  private tryRefreshToken(): Promise<string | null> {
    if (!this.refreshToken) return Promise.resolve(null);
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: this.refreshToken,
      })
      .then((response) => {
        const data = response.data?.data;
        if (data?.accessToken) {
          this.setAuthToken(data.accessToken);
          if (data.refreshToken) {
            this.setRefreshToken(data.refreshToken);
          }
          return data.accessToken as string;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  private persistSession(data: any) {
    if (!data) return data;
    if (data.accessToken) {
      this.setAuthToken(data.accessToken);
    }
    if (data.refreshToken) {
      this.setRefreshToken(data.refreshToken);
    }
    const user = normalizeUser(data.user);
    if (user) {
      data.user = user;
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    }
    return data;
  }

  // Auth endpoints
  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
    });
    return this.persistSession(response.data?.data);
  }

  async login(usernameOrEmail: string, password: string) {
    const response = await this.client.post('/auth/login', {
      username: usernameOrEmail,
      password,
    });
    return this.persistSession(response.data?.data);
  }

  async logout() {
    // Best-effort server notification; ignore failures (e.g. expired token)
    try {
      await this.client.post('/auth/logout');
    } catch {
      // no-op
    }
    this.clearAuth();
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    const data = response.data?.data;
    if (data?.user) {
      data.user = normalizeUser(data.user);
    }
    return data;
  }

  async updateProfile(data: { avatar?: string; bio?: string; country?: string }) {
    const response = await this.client.put('/auth/profile', data);
    const result = response.data?.data;
    if (result?.user) {
      result.user = normalizeUser(result.user);
    }
    return result;
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

  // Current access token (used to authenticate the PartyKit join handshake)
  getToken() {
    return this.token;
  }

  // Get current user from localStorage
  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
