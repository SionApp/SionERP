export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeoError {
  code: number;
  message: string;
}

export type GeoCallback = (position: GeoPosition) => void;
export type ErrorCallback = (error: GeoError) => void;

class GeolocationService {
  private watchId: number | null = null;

  /**
   * Get current position once
   */
  getCurrentPosition(
    onSuccess: GeoCallback,
    onError?: ErrorCallback,
    options?: PositionOptions
  ): Promise<GeoPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error: GeoError = { code: -1, message: 'Geolocation not supported' };
        onError?.(error);
        reject(error);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPos: GeoPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          onSuccess(geoPos);
          resolve(geoPos);
        },
        (error) => {
          const geoError: GeoError = {
            code: error.code,
            message: this.getErrorMessage(error.code),
          };
          onError?.(geoError);
          reject(geoError);
        },
        {
          enableHighAccuracy: true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 60000,
        }
      );
    });
  }

  /**
   * Watch position continuously
   */
  watchPosition(
    onSuccess: GeoCallback,
    onError?: ErrorCallback,
    options?: PositionOptions
  ): number {
    if (!this.watchId) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const geoPos: GeoPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          onSuccess(geoPos);
        },
        (error) => {
          const geoError: GeoError = {
            code: error.code,
            message: this.getErrorMessage(error.code),
          };
          onError?.(geoError);
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0,
        }
      );
    }
    return this.watchId;
  }

  /**
   * Stop watching
   */
  clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Check if geolocation is available
   */
  isAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check if geolocation is available
   */
  async requestPermission(): Promise<boolean> {
    // iOS 13+ requires explicit permission request
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state === 'granted';
      } catch {
        // Fallback for browsers without geolocation permission query
        return this.isAvailable();
      }
    }
    return this.isAvailable();
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Permission denied';
      case 2:
        return 'Position unavailable';
      case 3:
        return 'Timeout';
      default:
        return 'Unknown error';
    }
  }
}

export const geoService = new GeolocationService();