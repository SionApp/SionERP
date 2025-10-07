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
  private static baseUrl = 'http://localhost:8181/api/v1';

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

    return headers;
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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        const errorDetails = errorData.details ? ` - ${errorData.details}` : '';

        console.error(`Error in GET ${endpoint}:`, {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
        });

        throw new Error(`${errorMessage}${errorDetails}`);
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
   * Generic POST request
   */
  static async post<T, U = unknown>(endpoint: string, data?: U): Promise<T> {
    loadingCallbacks.setSubmitting?.(true);
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
   * Generic DELETE request
   */
  static async delete<T>(endpoint: string): Promise<T> {
    loadingCallbacks.setSubmitting?.(true);
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
