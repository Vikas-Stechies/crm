import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}
const isNative = window.hasOwnProperty('Capacitor');
const API_BASE_URL = isNative ? "http://172.20.10.2:3000" : "";
const getAbsoluteUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  // Ensure we don't end up with double slashes like //api
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Construct absolute URL
  const absoluteUrl = (isNative && !url.startsWith('http'))
    ? `${API_BASE_URL}${url}`
    : url;
  //const absoluteUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const res = await fetch(absoluteUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      // Use the helper to ensure consistent URL logic
      const path = queryKey.join("/");
      const res = await fetch(getAbsoluteUrl(path), {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
