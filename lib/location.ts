export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface GeolocationPosition {
  coords: GeolocationCoordinates;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  name: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN_ERROR';
}

export interface GetCurrentPositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface GeolocationResult {
  success: true;
  position: GeolocationPosition;
}

export interface GeolocationErrorResult {
  success: false;
  error: GeolocationError;
}

export type GeolocationResponse = GeolocationResult | GeolocationErrorResult;

export interface WatchPositionOptions extends GetCurrentPositionOptions {
  signal?: AbortSignal;
}

export interface WatchPositionResult {
  watchId: number;
  stop: () => void;
}

export interface BrowserGeolocationAPI {
  getCurrentPosition(
    options?: GetCurrentPositionOptions,
  ): Promise<GeolocationResponse>;

  watchPosition(
    callback: (position: GeolocationPosition) => void,
    errorCallback?: (error: GeolocationError) => void,
    options?: WatchPositionOptions,
  ): WatchPositionResult;

  requestPermission(): Promise<GeolocationPermissionState>;

  isSupported(): boolean;
}

export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

function createGeolocationError(
  error: GeolocationPositionError,
): GeolocationError {
  const errorNames: Record<number, GeolocationError['name']> = {
    1: 'PERMISSION_DENIED',
    2: 'POSITION_UNAVAILABLE',
    3: 'TIMEOUT',
  };

  return {
    code: error.code,
    message: error.message,
    name: errorNames[error.code] ?? 'UNKNOWN_ERROR',
  };
}

function createSuccessResponse(position: GeolocationPosition): GeolocationResult {
  return {
    success: true,
    position: {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
      },
      timestamp: position.timestamp,
    },
  };
}

function createErrorResponse(error: GeolocationPositionError): GeolocationErrorResult {
  return {
    success: false,
    error: createGeolocationError(error),
  };
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export async function requestGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (!isGeolocationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state as GeolocationPermissionState;
  } catch {
    return 'unsupported';
  }
}

export async function getCurrentPosition(
  options: GetCurrentPositionOptions = {},
): Promise<GeolocationResponse> {
  if (!isGeolocationSupported()) {
    return {
      success: false,
      error: {
        code: 0,
        message: 'Geolocation is not supported in this browser',
        name: 'UNKNOWN_ERROR',
      },
    };
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: options.enableHighAccuracy ?? true,
    timeout: options.timeout ?? 10000,
    maximumAge: options.maximumAge ?? 0,
  };

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(createSuccessResponse(position)),
      (error) => resolve(createErrorResponse(error)),
      defaultOptions,
    );
  });
}

export function watchPosition(
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationError) => void,
  options: WatchPositionOptions = {},
): WatchPositionResult {
  if (!isGeolocationSupported()) {
    const error: GeolocationError = {
      code: 0,
      message: 'Geolocation is not supported in this browser',
      name: 'UNKNOWN_ERROR',
    };
    errorCallback?.(error);
    return {
      watchId: -1,
      stop: () => {},
    };
  }

  const watchOptions: PositionOptions = {
    enableHighAccuracy: options.enableHighAccuracy ?? true,
    timeout: options.timeout ?? 10000,
    maximumAge: options.maximumAge ?? 0,
  };

  let watchId: number;

  const handleSuccess = (position: GeolocationPosition) => {
    callback(position);
  };

  const handleError = (error: GeolocationPositionError) => {
    const geoError = createGeolocationError(error);
    errorCallback?.(geoError);
  };

  watchId = navigator.geolocation.watchPosition(
    handleSuccess,
    handleError,
    watchOptions,
  );

  const stop = () => {
    navigator.geolocation.clearWatch(watchId);
  };

  if (options.signal) {
    options.signal.addEventListener('abort', stop);
  }

  return { watchId, stop };
}

export function stopWatch(watchId: number): void {
  if (watchId >= 0 && isGeolocationSupported()) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export function createGeolocationHelper(): BrowserGeolocationAPI {
  return {
    getCurrentPosition,
    watchPosition,
    requestPermission: requestGeolocationPermission,
    isSupported: isGeolocationSupported,
  };
}

export const geolocation = createGeolocationHelper();