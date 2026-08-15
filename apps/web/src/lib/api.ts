const apiUrl = "/api";

export async function api<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${endpoint}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { apiUrl };
