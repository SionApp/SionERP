import { supabase } from '@/integrations/supabase/client';

// Singleton para callbacks de loading
let loadingCallbacks: {
  setFetching?: (loading: boolean) => void;
  setSubmitting?: (loading: boolean) => void;
} = {};

export const setLoadingCallbacks = (callbacks: typeof loadingCallbacks) => {
  loadingCallbacks = callbacks;
};

export class ApiService {
  private static baseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8181'}/api/v1`;

  // Sesión única activa: el X-Session-Id NO se manda hasta que useSessionGuard
  // confirmó el claim (markSessionClaimed). Si lo mandáramos antes, un request
  // que sale ANTES de que el claim termine (ej. permissions/me en el login)
  // llevaría un session_id que todavía no coincide con la fila activa → 401
  // SESSION_SUPERSEDED espurio → el usuario "no entra". Antes del claim no hay
  // enforcement (el backend no bloquea sin header); después sí.
  private static sessionClaimed = false;
  static markSessionClaimed() {
    this.sessionClaimed = true;
  }

  /**
   * Get authorization header with current user token
   */
  private static async getAuthHeaders(): Promise<Headers> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    // Solo tras confirmar el claim. Se lee localStorage directo — NO importar
    // session.ts acá (crearía un ciclo, session.ts importa ApiService).
    if (this.sessionClaimed) {
      const sessionId = localStorage.getItem('sion_session_id');
      if (sessionId) {
        headers.set('X-Session-Id', sessionId);
      }
    }

    return headers;
  }

  // Ante un 401 con code SESSION_* (sesión tomada por otro dispositivo o
  // vencida por inactividad), avisa a useSessionGuard para desloguear con un
  // mensaje claro. Mismo nombre de evento que lib/session.ts SESSION_INVALID_EVENT.
  private static notifyIfSessionInvalid(status: number, errorData: { code?: string }): void {
    if (
      status === 401 &&
      typeof errorData.code === 'string' &&
      errorData.code.startsWith('SESSION_')
    ) {
      window.dispatchEvent(
        new CustomEvent('sion:session-invalid', { detail: { code: errorData.code } })
      );
    }
  }

  /**
   * Generic GET request
   */
  static async get<T>(endpoint: string): Promise<T> {
    loadingCallbacks.setFetching?.(true);
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include', // manda la cookie httpOnly de sesión federada (acceso BonDev) si existe
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.notifyIfSessionInvalid(response.status, errorData);
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        const errorDetails = errorData.details ? ` - ${errorData.details}` : '';

        console.error(`Error in GET ${endpoint}:`, {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
        });

        const error = new Error(`${errorMessage}${errorDetails}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in GET ${endpoint}:`, error);
      throw error;
    } finally {
      loadingCallbacks.setFetching?.(false);
    }
  }

  /**
   * Authenticated binary GET — returns a Blob (for file downloads behind JWT).
   */
  static async getBlob(endpoint: string): Promise<Blob> {
    loadingCallbacks.setFetching?.(true);
    try {
      const headers = await this.getAuthHeaders();
      headers.delete('Content-Type');
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        const msg = await response.text().catch(() => '');
        const error = new Error(msg || `HTTP ${response.status}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return await response.blob();
    } finally {
      loadingCallbacks.setFetching?.(false);
    }
  }

  /**
   * Generic POST request
   */
  static async post<T, U = unknown>(endpoint: string, data?: U): Promise<T> {
    loadingCallbacks.setSubmitting?.(true);
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.notifyIfSessionInvalid(response.status, errorData);
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        const errorDetails = errorData.details ? ` - ${errorData.details}` : '';

        console.error(`Error in POST ${endpoint}:`, {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
        });

        throw new Error(`${errorMessage}${errorDetails}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in POST ${endpoint}:`, error);
      throw error;
    } finally {
      loadingCallbacks.setSubmitting?.(false);
    }
  }

  /**
   * Generic PUT request
   */
  static async put<T, U = unknown>(endpoint: string, data?: U): Promise<T> {
    loadingCallbacks.setSubmitting?.(true);
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.notifyIfSessionInvalid(response.status, errorData);
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        const errorDetails = errorData.details ? ` - ${errorData.details}` : '';

        console.error(`Error in PUT ${endpoint}:`, {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
        });

        throw new Error(`${errorMessage}${errorDetails}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in PUT ${endpoint}:`, error);
      throw error;
    } finally {
      loadingCallbacks.setSubmitting?.(false);
    }
  }

  /**
   * Generic PATCH request
   */
  static async patch<T, U = unknown>(endpoint: string, data?: U): Promise<T> {
    loadingCallbacks.setSubmitting?.(true);
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.notifyIfSessionInvalid(response.status, errorData);
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        const errorDetails = errorData.details ? ` - ${errorData.details}` : '';

        console.error(`Error in PATCH ${endpoint}:`, {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
        });

        throw new Error(`${errorMessage}${errorDetails}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in PATCH ${endpoint}:`, error);
      throw error;
    } finally {
      loadingCallbacks.setSubmitting?.(false);
    }
  }

  /**
   * Generic DELETE request
   */
  static async delete<T>(endpoint: string): Promise<T> {
    loadingCallbacks.setSubmitting?.(true);
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.notifyIfSessionInvalid(response.status, errorData);
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        const errorDetails = errorData.details ? ` - ${errorData.details}` : '';

        console.error(`Error in DELETE ${endpoint}:`, {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
        });

        throw new Error(`${errorMessage}${errorDetails}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in DELETE ${endpoint}:`, error);
      throw error;
    } finally {
      loadingCallbacks.setSubmitting?.(false);
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string }> {
    return this.get('/health');
  }
}
