import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertHotel } from "@shared/schema";

export function useHotels() {
  return useQuery({
    queryKey: [api.hotels.list.path],
    queryFn: async () => {
      const res = await fetch(api.hotels.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hotels");
      return api.hotels.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertHotel) => {
      const res = await fetch(api.hotels.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create hotel");
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
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update hotel");
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
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete hotel");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.hotels.list.path] }),
  });
}
