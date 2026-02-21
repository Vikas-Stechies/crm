import React, { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@shared/routes";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient"; // Import the helper

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
};

const AuthContext = React.createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function useLoginMutation() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: typeof api.auth.login.input._type) => {
      // apiRequest handles the environment-specific URL logic and credentials
      const res = await apiRequest("POST", api.auth.login.path, credentials);

      const rawData = await res.json();
      const user = api.auth.login.responses[200].parse(rawData);

      if (rawData.subscriptionWarning) {
        (user as any).subscriptionWarning = rawData.subscriptionWarning;
      }

      return user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    },
  });
}

function useLogoutMutation() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      // Uses apiRequest for consistent cross-platform logout
      await apiRequest("POST", api.auth.logout.path);
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation("/auth");
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      try {
        // apiRequest ensures the correct absolute URL for session checking
        const res = await apiRequest("GET", api.auth.me.path);
        return api.auth.me.responses[200].parse(await res.json());
      } catch (e: any) {
        // Handle 401 specifically for initial session check
        if (e.message?.includes("401")) {
          return null;
        }
        throw e;
      }
    },
  });

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        loginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}