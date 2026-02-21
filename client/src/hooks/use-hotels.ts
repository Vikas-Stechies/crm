import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertHotel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient"; // Import the helper

export function useHotels() {
  return useQuery({
    queryKey: [api.hotels.list.path],
    queryFn: async () => {
      // Replaced fetch with apiRequest
      const res = await apiRequest("GET", api.hotels.list.path);
      return api.hotels.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertHotel) => {
      // Let apiRequest handle headers, JSON stringification, and credentials
      const res = await apiRequest("POST", api.hotels.create.path, data);
      return api.hotels.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.hotels.list.path] }),
  });
}

export function useUpdateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertHotel>) => {
      const url = buildUrl(api.hotels.update.path, { id });
      // Let apiRequest handle headers, JSON stringification, and credentials
      const res = await apiRequest("PATCH", url, data);
      return api.hotels.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.hotels.list.path] }),
  });
}

export function useDeleteHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.hotels.delete.path, { id });
      // apiRequest automatically throws if not ok, simplifying the logic
      await apiRequest("DELETE", url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.hotels.list.path] }),
  });
}