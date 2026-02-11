import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertBooking } from "@shared/schema";

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookings.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return api.bookings.list.responses[200].parse(await res.json());
    },
  });
}

export function useOccupancy() {
  return useQuery({
    queryKey: [api.analytics.occupancy.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.occupancy.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch occupancy");
      return api.analytics.occupancy.responses[200].parse(await res.json());
    },
  });
}

export function useRevenue() {
  return useQuery({
    queryKey: [api.analytics.revenue.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.revenue.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch revenue");
      return api.analytics.revenue.responses[200].parse(await res.json());
    },
  });
}

export function useAgencies() {
  return useQuery({
    queryKey: [api.agencies.list.path],
    queryFn: async () => {
      const res = await fetch(api.agencies.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agencies");
      return api.agencies.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBooking) => {
      const res = await fetch(api.bookings.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create booking");
      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] }),
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertBooking>) => {
      const url = buildUrl(api.bookings.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update booking");
      return api.bookings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] }),
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete booking");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] }),
  });
}
export function useForecast() {
  return useQuery({
    queryKey: [api.analytics.forecast.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.forecast.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch forecast");
      return api.analytics.forecast.responses[200].parse(await res.json());
    },
  });
}