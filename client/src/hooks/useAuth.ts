import { useEffect } from "react";
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

export function useAuth() {
  const token = localStorage.getItem("hms_token");

  const { data: authData, isLoading, error, isSuccess } = useQuery<{ user: User }, Error, User>({
    queryKey: ["/api", "auth", "me"],
    retry: false,
    enabled: !!token, // Only run query if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data?.user, // Extract user from { user: ... } response
  });

  // Detect bad server response shape: token present, query succeeded, but user is missing
  useEffect(() => {
    if (token && isSuccess && !authData) {
      console.error("useAuth: /api/auth/me returned an unexpected shape — 'user' field is missing");
      toast({
        title: "Session error",
        description: "Your session could not be verified. Please sign in again.",
        variant: "destructive",
      });
      localStorage.removeItem("hms_token");
    }
  }, [token, isSuccess, authData]);

  const logout = () => {
    localStorage.removeItem("hms_token");
    window.location.reload();
  };

  return {
    user: authData,
    isLoading: isLoading && !!token, // Only show loading if we have a token
    isAuthenticated: !!authData && !!token,
    error,
    logout,
  };
}

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}