import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useOccupancyStats(params?: { month?: number; year?: number }) {
  return useQuery({
    // Include params in queryKey to trigger a refetch when date changes
    queryKey: [api.analytics.occupancy.path, params],
    queryFn: async () => {
      const url = new URL(api.analytics.occupancy.path, window.location.origin);
      if (params?.month !== undefined) url.searchParams.append("month", params.month.toString());
      if (params?.year !== undefined) url.searchParams.append("year", params.year.toString());

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch occupancy");
      return api.analytics.occupancy.responses[200].parse(await res.json());
    },
  });
}
export function useRevenueStats() {
  return useQuery({
    queryKey: [api.analytics.revenue.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.revenue.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch revenue");
      return api.analytics.revenue.responses[200].parse(await res.json());
    },
  });
}
