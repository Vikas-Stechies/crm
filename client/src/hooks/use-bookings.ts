import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertBooking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.bookings.list.path);
      return api.bookings.list.responses[200].parse(await res.json());
    },
  });
}

export function useOccupancy() {
  return useQuery({
    queryKey: [api.analytics.occupancy.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.analytics.occupancy.path);
      return api.analytics.occupancy.responses[200].parse(await res.json());
    },
  });
}

export function useRevenue() {
  return useQuery({
    queryKey: [api.analytics.revenue.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.analytics.revenue.path);
      return api.analytics.revenue.responses[200].parse(await res.json());
    },
  });
}

export function useAgencies() {
  return useQuery({
    queryKey: [api.agencies.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.agencies.list.path);
      return api.agencies.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBooking) => {
      const res = await apiRequest("POST", api.bookings.create.path, data);
      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertBooking>) => {
      const url = buildUrl(api.bookings.update.path, { id });
      const res = await apiRequest("PATCH", url, data);
      // Fixed: Now uses the correct 200 response schema for updates
      return api.bookings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    },
  });
}

export function useForecast() {
  return useQuery({
    queryKey: [api.analytics.forecast.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.analytics.forecast.path);
      return api.analytics.forecast.responses[200].parse(await res.json());
    },
  });
}