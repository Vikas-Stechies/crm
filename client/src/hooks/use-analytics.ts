import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useOccupancyStats() {
  return useQuery({
    queryKey: [api.analytics.occupancy.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.occupancy.path, { credentials: "include" });
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
