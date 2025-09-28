import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  username: string;
  role: string;
  propertyId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Add token to API requests
const apiRequestWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("hms_token");
  
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token is invalid or expired, remove it
    localStorage.removeItem("hms_token");
    throw new Error("401: Unauthorized");
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }

  return response.json();
};

export function useAuth() {
  const token = localStorage.getItem("hms_token");

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => apiRequestWithAuth("/api/auth/me"),
    retry: false,
    enabled: !!token, // Only run query if token exists
  });

  const logout = () => {
    localStorage.removeItem("hms_token");
    window.location.href = "/";
  };

  return {
    user: user as User | undefined,
    isLoading: isLoading && !!token, // Only show loading if we have a token
    isAuthenticated: !!user && !!token,
    error,
    logout,
  };
}

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}