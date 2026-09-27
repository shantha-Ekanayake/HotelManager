import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  role: string;
  propertyId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

const tokenListeners = new Set<() => void>();

function subscribeToToken(listener: () => void) {
  tokenListeners.add(listener);
  return () => { tokenListeners.delete(listener); };
}

function getToken() {
  return localStorage.getItem("hms_token");
}

function clearToken(token: string) {
  if (getToken() !== token) return;
  localStorage.removeItem("hms_token");
  tokenListeners.forEach((listener) => listener());
}

export function useAuth() {
  const token = useSyncExternalStore(subscribeToToken, getToken);

  const { data: authData, isLoading, error, isSuccess, refetch } = useQuery<{ user: User }, Error, User>({
    queryKey: ["/api", "auth", "me"],
    retry: false,
    enabled: !!token, // Only run query if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data?.user, // Extract user from { user: ... } response
  });

  // Detect bad server response shape: token present, query succeeded, but user is missing
  useEffect(() => {
    if (token && isSuccess && !authData && getToken() === token) {
      console.error("useAuth: /api/auth/me returned an unexpected shape — 'user' field is missing");
      toast({
        title: "Session error",
        description: "Your session could not be verified. Please sign in again.",
        variant: "destructive",
      });
      clearToken(token);
    }
  }, [token, isSuccess, authData]);

  useEffect(() => {
    if (token && error && isUnauthorizedError(error) && getToken() === token) {
      clearToken(token);
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
    }
  }, [token, error]);

  const logout = () => {
    if (token) clearToken(token);
    window.location.reload();
  };

  return {
    user: authData,
    isLoading: isLoading && !!token, // Only show loading if we have a token
    isAuthenticated: !!authData && !!token,
    error,
    retryVerification: refetch,
    logout,
  };
}

export function isUnauthorizedError(error: Error): boolean {
  return /^401:/.test(error.message);
}