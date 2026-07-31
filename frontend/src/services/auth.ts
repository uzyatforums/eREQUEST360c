const TOKEN_KEY = 'e360_auth_token'

export interface LoginResponse {
  access_token: string
  token_type?: string
}

export const authService = {
  /**
   * Retrieves the active JWT token from sessionStorage.
   */
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY)
  },

  /**
   * Stores the JWT token strictly in sessionStorage.
   */
  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token)
  },

  /**
   * Purges the JWT token from sessionStorage.
   */
  removeToken(): void {
    sessionStorage.removeItem(TOKEN_KEY)
  },

  /**
   * Checks whether a token is present in sessionStorage.
   */
  hasToken(): boolean {
    return !!this.getToken()
  },
}
