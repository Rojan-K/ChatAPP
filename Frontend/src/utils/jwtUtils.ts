// JWT utility functions for token validation and refresh

export interface JwtPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = parseJWT(token);
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if we can't parse
  }
};

export const parseJWT = (token: string): JwtPayload => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    throw new Error('Invalid token format');
  }
};

export const getTokenExpirationTime = (token: string): number | null => {
  try {
    const payload = parseJWT(token);
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error getting token expiration:', error);
    return null;
  }
};

export const shouldRefreshToken = (token: string, bufferMinutes: number = 5): boolean => {
  try {
    const payload = parseJWT(token);
    const currentTime = Date.now() / 1000;
    const expirationTime = payload.exp;
    const bufferTime = bufferMinutes * 60; // Convert minutes to seconds
    
    return expirationTime - currentTime <= bufferTime;
  } catch (error) {
    console.error('Error checking if token should be refreshed:', error);
    return true; // Assume it needs refresh if we can't parse
  }
};
