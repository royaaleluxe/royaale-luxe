import { storefrontAuth } from "@/lib/firebase";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getIdToken(): Promise<string> {
  const user = storefrontAuth?.currentUser;
  if (!user) throw new ApiError("Please sign in to continue", 401);
  return user.getIdToken();
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, ...init } = options;
  const headers = new Headers(init.headers);

  if (auth) {
    const token = await getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || `Request failed (${res.status})`,
      res.status
    );
  }

  return data;
}

export async function createOrderViaApi(payload: Record<string, unknown>) {
  return apiFetch<{
    success: boolean;
    firestoreOrderId: string;
    orderId: string;
    total: number;
  }>("/api/orders/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelOrderViaApi(firestoreOrderId: string, reason?: string) {
  return apiFetch<{ success: boolean }>(`/api/orders/${firestoreOrderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function subscribeNewsletterViaApi(email: string) {
  return apiFetch<{ success: boolean; message: string; alreadySubscribed?: boolean }>(
    "/api/newsletter/subscribe",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email }),
    }
  );
}

export async function generateBulkPromosViaApi(payload: Record<string, unknown>) {
  return adminApiFetch<{ success: boolean; promos: { code: string; id: string }[]; count: number }>(
    "/api/admin/promos/bulk",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function triggerBackInStockCheck(productId: string) {
  return adminApiFetch<{ success: boolean; emailsSent: number }>(
    "/api/admin/alerts/back-in-stock",
    {
      method: "POST",
      body: JSON.stringify({ productId }),
    }
  );
}

async function getAdminIdToken(): Promise<string | null> {
  const { adminAuth } = await import("@/lib/firebase");
  return (await adminAuth?.currentUser?.getIdToken()) ?? null;
}

export async function adminApiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = await getAdminIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || `Request failed (${res.status})`,
      res.status
    );
  }

  return data;
}
