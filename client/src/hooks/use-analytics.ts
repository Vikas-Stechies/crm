import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useOccupancyStats(params?: { month?: number; year?: number }) {
  return useQuery({
    // Include params in queryKey to trigger a refetch when date changes
    queryKey: [api.analytics.occupancy.path, params],
    queryFn: async () => {
      // Build the path with query parameters
      let path = api.analytics.occupancy.path;
      const searchParams = new URLSearchParams();

      if (params?.month !== undefined) searchParams.append("month", params.month.toString());
      if (params?.year !== undefined) searchParams.append("year", params.year.toString());

      const queryString = searchParams.toString();
      const finalPath = queryString ? `${path}?${queryString}` : path;

      // Use apiRequest to handle environment-specific URL logic and credentials
      const res = await apiRequest("GET", finalPath);
      return api.analytics.occupancy.responses[200].parse(await res.json());
    },
  });
}

export function useRevenueStats() {
  return useQuery({
    queryKey: [api.analytics.revenue.path],
    queryFn: async () => {
      // Use apiRequest helper for consistency across web and mobile
      const res = await apiRequest("GET", api.analytics.revenue.path);
      return api.analytics.revenue.responses[200].parse(await res.json());
    },
  });
}