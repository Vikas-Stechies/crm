import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient"; // Import the helper

export function useUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      // Use apiRequest to ensure absolute URLs on Capacitor
      const res = await apiRequest("GET", api.users.list.path);
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertUser) => {
      // apiRequest handles stringifying JSON, setting headers, and adding credentials
      const res = await apiRequest("POST", api.users.create.path, data);
      return api.users.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.users.list.path] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertUser>) => {
      const url = buildUrl(api.users.update.path, { id });
      // apiRequest handles stringifying JSON, setting headers, and adding credentials
      const res = await apiRequest("PATCH", url, data);
      return api.users.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.users.list.path] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.users.delete.path, { id });
      // apiRequest throws automatically on non-ok responses
      await apiRequest("DELETE", url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.users.list.path] }),
  });
}