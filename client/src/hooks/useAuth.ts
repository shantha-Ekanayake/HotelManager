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

export function useAuth() {
  const token = localStorage.getItem("hms_token");

  const { data: authData, isLoading, error } = useQuery({
    queryKey: ["/api", "auth", "me"],
    retry: false,
    enabled: !!token, // Only run query if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data?.user, // Extract user from { user: ... } response
  });

  const logout = () => {
    localStorage.removeItem("hms_token");
    window.location.reload();
  };

  return {
    user: authData as User | undefined,
    isLoading: isLoading && !!token, // Only show loading if we have a token
    isAuthenticated: !!authData && !!token,
    error,
    logout,
  };
}

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}