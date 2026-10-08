const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const TOKEN_KEY = "ziba_token";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export async function request(path: string, init: RequestInit = {}) {
  const token = getToken();
  const response = await fetch(`${API}${path}`, { ...init, headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) { const error: any = new Error(body?.error || `Request failed (${response.status})`); error.code = body?.code; throw error; }
  return body;
}

export const db = {
  auth: {
    async getSession() { const token = getToken(); if (!token) return { data: { session: null } }; try { const { user } = await request("/auth/me"); return { data: { session: { access_token: token, user } } }; } catch { localStorage.removeItem(TOKEN_KEY); return { data: { session: null } }; } },
    onAuthStateChange(callback: (event: string, session: any) => void) { const handler = () => { void db.auth.getSession().then(({ data }) => callback("SIGNED_IN", data.session)); }; window.addEventListener("ziba-auth", handler); return { data: { subscription: { unsubscribe: () => window.removeEventListener("ziba-auth", handler) } } }; },
    async signUp({ email, password, options }: any) { try { const result = await request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name: options?.data?.full_name }) }); localStorage.setItem(TOKEN_KEY, result.token); window.dispatchEvent(new Event("ziba-auth")); return { data: result, error: null }; } catch (error: any) { return { data: null, error }; } },
    async signInWithPassword({ email, password }: any) { try { const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); localStorage.setItem(TOKEN_KEY, result.token); window.dispatchEvent(new Event("ziba-auth")); return { data: { user: result.user, session: { access_token: result.token, user: result.user } }, error: null }; } catch (error: any) { return { data: null, error }; } },
    async signInWithOAuth({ credential }: { credential: string }) { try { const result = await request("/auth/google", { method: "POST", body: JSON.stringify({ credential }) }); localStorage.setItem(TOKEN_KEY, result.token); window.dispatchEvent(new Event("ziba-auth")); return { data: { user: result.user, session: { access_token: result.token, user: result.user } }, error: null }; } catch (error: any) { return { data: null, error }; } },
    async signOut() { localStorage.removeItem(TOKEN_KEY); window.dispatchEvent(new Event("ziba-auth")); return { error: null }; },
  },
  from(table: string) { return new Query(table); },
  storage: { from(bucket: string) { return { upload: async (path: string, file: File, _options?: any) => { try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); const result = await request("/uploads", { method: "POST", body: JSON.stringify({ file: data, path, bucket }) }); return { data: result, error: null }; } catch (error: any) { return { data: null, error }; } }, getPublicUrl(path: string) { return { data: { publicUrl: `${API}/uploads/${encodeURIComponent(path)}` } }; }, createSignedUrl: async (path: string, _expiresIn?: number) => { try { const result = await request("/uploads/signed-url", { method: "POST", body: JSON.stringify({ path }) }); return { data: { signedUrl: result.signedUrl }, error: null }; } catch (error: any) { return { data: null, error }; } } }; } },
  channel(name: string) {
    const handlers: Array<{ event: string; filter: any; callback: (payload: any) => void; previous: Map<string, any>; started: boolean }> = [];
    let timer: number;
    return {
      on(_kind: string, filter: any, callback: (payload: any) => void) { handlers.push({ event: filter?.event || "*", filter: filter || {}, callback, previous: new Map(), started: false }); return this; },
      subscribe() {
        const poll = async () => {
          for (const handler of handlers) {
            if (!handler.filter.table) continue;
            const filters: any[] = [];
            const match = String(handler.filter.filter || "").match(/^([\w]+)=eq\.(.+)$/);
            if (match) filters.push({ field: match[1], op: "eq", value: match[2] });
            try {
              const result = await request(`/data/${encodeURIComponent(handler.filter.table)}`, { method: "POST", body: JSON.stringify({ action: "select", filters, sort: {} }) });
              const rows = result?.data || [];
              const current = new Map<string, any>(rows.map((row: any) => [String(row.id), row] as [string, any]));
              if (handler.started) {
                current.forEach((row: any, id: string) => handler.previous.has(id) ? (JSON.stringify(handler.previous.get(id)) !== JSON.stringify(row) && ["UPDATE", "*"].includes(handler.event) && handler.callback({ new: row, old: handler.previous.get(id) })) : (["INSERT", "*"].includes(handler.event) && handler.callback({ new: row, old: null })));
              }
              handler.previous = current; handler.started = true;
            } catch { /* Poll again on the next tick if the API is temporarily unavailable. */ }
          }
        };
        void poll(); timer = window.setInterval(() => void poll(), 3000); return this;
      },
      _stop() { window.clearInterval(timer); },
    };
  },
  removeChannel(channel: any) { channel?._stop?.(); return Promise.resolve("ok"); },
};

interface QueryResult { data: any; error: any; count: number | null }
class Query implements PromiseLike<QueryResult> {
  private filters: any[] = []; private sort: any = {}; private countMode = false; private head = false; private action = "select"; private values: any;
  constructor(private table: string) {}
  select(_columns = "*", options?: any) { this.countMode = options?.count === "exact"; this.head = !!options?.head; return this; }
  insert(values: any) { this.action = "insert"; this.values = values; return this; }
  update(values: any) { this.action = "update"; this.values = values; return this; }
  delete() { this.action = "delete"; return this; }
  eq(field: string, value: any) { this.filters.push({ field, op: "eq", value }); return this; }
  neq(field: string, value: any) { this.filters.push({ field, op: "neq", value }); return this; }
  is(field: string, value: any) { this.filters.push({ field, op: "is", value }); return this; }
  gte(field: string, value: any) { this.filters.push({ field, op: "gte", value }); return this; }
  lte(field: string, value: any) { this.filters.push({ field, op: "lte", value }); return this; }
  ilike(field: string, value: string) { this.filters.push({ field, op: "ilike", value }); return this; }
  textSearch(_field: string, value: string, _options?: any) { this.filters.push({ field: "$search", op: "text", value }); return this; }
  or(value: string) { this.filters.push({ field: "$or", op: "or", value }); return this; }
  order(field: string, options?: any) { this.sort[field] = options?.ascending === false ? -1 : 1; return this; }
  limit(value: number) { this.filters.push({ field: "$limit", op: "limit", value }); return this; }
  private async execute(single = false, maybe = false): Promise<any> {
    try {
      const result = await request(`/data/${encodeURIComponent(this.table)}`, { method: "POST", body: JSON.stringify({ action: this.action, values: this.values, filters: this.filters, sort: this.sort, single, maybe, head: this.head, count: this.countMode }) });
      return { data: result.data ?? null, error: null, count: result.count ?? null };
    } catch (error: any) { return { data: null, error, count: null }; }
  }
  single() { return this.execute(true); }
  maybeSingle() { return this.execute(false, true); }
  then<TResult1 = QueryResult, TResult2 = never>(onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> { return this.execute().then(onfulfilled, onrejected); }
}
