import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useAiForecast() {
  return useQuery({
    queryKey: [api.ai.forecast.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.ai.forecast.path);
      return api.ai.forecast.responses[200].parse(await res.json());
    }
  });
}

export function useAiStaffing() {
  return useQuery({
    queryKey: [api.ai.staffing.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.ai.staffing.path);
      return api.ai.staffing.responses[200].parse(await res.json());
    }
  });
}

export function useGenerateMessage() {
  return useMutation({
    mutationFn: async (data: typeof api.ai.generateMessage.input._type) => {
      const res = await apiRequest("POST", api.ai.generateMessage.path, data);
      return api.ai.generateMessage.responses[200].parse(await res.json());
    }
  });
}

export function useGenerateReviewResponse() {
  return useMutation({
    mutationFn: async (data: typeof api.ai.reviewResponse.input._type) => {
      const res = await apiRequest("POST", api.ai.reviewResponse.path, data);
      return api.ai.reviewResponse.responses[200].parse(await res.json());
    }
  });
}