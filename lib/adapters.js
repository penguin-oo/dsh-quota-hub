// dsh-quota-hub — provider quota adapters. Each adapter fetches a provider's
// quota endpoint on the HOST side (keys never reach the browser) and returns
// a normalized item list for the panel.
//
// Built-ins auto-detect by credential presence; custom providers come from
// the user config file (~/.dsh/dsh-quota-hub.json).

const FETCH_TIMEOUT_MS = 10000;

export async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: { accept: "application/json", ...headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const bearer = (key) => ({ authorization: `Bearer ${key}` });
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : undefined);
const clamp = (value) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

/** Dot-path read with numeric coercion. */
export function extractPath(source, path) {
  const parts = String(path).split(".");
  let value = source;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = value[part];
  }
  return value;
}

export const BUILTIN_ADAPTERS = {
  "opencode-go": {
    label: "OpenCodeGo",
    credential: "OPENCODE_GO_API_KEY",
    async fetch(key) {
      const res = await fetchJson("https://opencode.ai/zen/go/v1/usage", bearer(key));
      const usage = res.usage ?? {};
      const windowOf = (name, label) => {
        const entry = usage[name] ?? {};
        return {
          key: name,
          label,
          percent: num(entry.percent),
          resetsAt: typeof entry.resetsAt === "string" ? entry.resetsAt : undefined,
        };
      };
      return {
        items: [
          windowOf("rolling", "滚动窗口（~5 小时）"),
          windowOf("weekly", "本周（~7 天）"),
          windowOf("monthly", "本月（~30 天）"),
        ],
      };
    },
  },
  deepseek: {
    label: "DeepSeek 官方",
    credential: "DEEPSEEK_API_KEY",
    async fetch(key) {
      const res = await fetchJson("https://api.deepseek.com/user/balance", bearer(key));
      const info = (res.balance_infos ?? [])[0] ?? {};
      return {
        items: [
          { key: "total", label: "总余额", value: num(info.total_balance), unit: info.currency ?? "CNY" },
          { key: "topped", label: "充值余额", value: num(info.topped_up_balance), unit: info.currency ?? "CNY" },
          { key: "granted", label: "赠送余额", value: num(info.granted_balance), unit: info.currency ?? "CNY" },
        ],
      };
    },
  },
  openrouter: {
    label: "OpenRouter",
    credential: "OPENROUTER_API_KEY",
    async fetch(key) {
      const res = await fetchJson("https://openrouter.ai/api/v1/auth/key", bearer(key));
      const data = res.data ?? {};
      const usage = num(data.usage);
      const limit = num(data.limit);
      const percent = usage !== undefined && limit && limit > 0 ? clamp((usage / limit) * 100) : undefined;
      return {
        items: [
          { key: "usage", label: "已用额度", value: usage, percent, unit: "USD" },
          { key: "limit", label: "额度上限", value: limit, unit: "USD" },
          { key: "remaining", label: "剩余", value: usage !== undefined && limit !== undefined ? Math.max(0, limit - usage) : undefined, unit: "USD" },
        ],
      };
    },
  },
  siliconflow: {
    label: "硅基流动",
    credential: "SILICONFLOW_API_KEY",
    async fetch(key) {
      const res = await fetchJson("https://api.siliconflow.cn/v1/user/info", bearer(key));
      const data = res.data ?? {};
      return {
        items: [{ key: "balance", label: "账户余额", value: num(data.balance), unit: data.currency ?? "CNY" }],
      };
    },
  },
  moonshot: {
    label: "Moonshot",
    credential: "MOONSHOT_API_KEY",
    async fetch(key) {
      const res = await fetchJson("https://api.moonshot.cn/v1/users/me/balance", bearer(key));
      const data = res.data ?? {};
      return {
        items: [
          { key: "available", label: "可用余额", value: num(data.available_balance), unit: "CNY" },
          { key: "voucher", label: "代金券余额", value: num(data.voucher_balance), unit: "CNY" },
          { key: "cash", label: "现金余额", value: num(data.cash_balance), unit: "CNY" },
        ],
      };
    },
  },
};

/**
 * Custom adapter from user config:
 * { id, label, url, credential?, headers?, fields: [{key,label,path,unit?,percent?,display?,resetsAt?}] }
 * - percent: true (value is a 0-100 percent) | { of: "path" } (value/ref*100)
 *   | { remainingOf: number } ((total-value)/total*100) | { used: "path", cap: "path" } (used/cap*100)
 * - display: string template, "{path}" placeholders resolve against the payload
 *   (numeric values rounded to 2 decimals) and become the string value shown.
 * - resetsAt: "path" to a reset timestamp (epoch ms or ISO string) for the reset line.
 */
export function customAdapter(entry) {
  return {
    label: entry.label ?? entry.id,
    credential: typeof entry.credential === "string" ? entry.credential : undefined,
    async fetch(key) {
      const headers = { ...(entry.headers ?? {}) };
      if (key !== undefined) headers.authorization = headers.authorization ?? `Bearer ${key}`;
      const res = await fetchJson(entry.url, headers);
      const items = (entry.fields ?? []).map((field) => {
        const raw = extractPath(res, field.path);
        const value = num(raw);
        let rendered;
        if (typeof field.display === "string") {
          rendered = field.display.replace(/\{([^}]+)\}/g, (_, path) => {
            const v = extractPath(res, path);
            const n = num(v);
            return n !== undefined ? String(Math.round(n * 100) / 100) : String(v ?? "");
          });
        }
        let percent;
        const pf = field.percent;
        if (pf === true) percent = value;
        else if (pf !== undefined && pf !== null && typeof pf === "object") {
          if (typeof pf.used === "string" && typeof pf.cap === "string") {
            const used = num(extractPath(res, pf.used));
            const cap = num(extractPath(res, pf.cap));
            if (used !== undefined && cap !== undefined && cap > 0) percent = (used / cap) * 100;
          } else if (typeof pf.remainingOf === "number") {
            if (value !== undefined && pf.remainingOf > 0) percent = ((pf.remainingOf - value) / pf.remainingOf) * 100;
          } else if (typeof pf.of === "string") {
            const ref = num(extractPath(res, pf.of));
            if (value !== undefined && ref !== undefined && ref > 0) percent = (value / ref) * 100;
          }
        }
        let resetsAt;
        if (typeof field.resetsAt === "string") {
          const rv = extractPath(res, field.resetsAt);
          if (rv !== undefined) {
            const rn = num(rv);
            resetsAt = rn !== undefined ? new Date(rn).toISOString() : String(rv);
          }
        }
        return {
          key: field.key,
          label: field.label ?? field.key,
          value: rendered !== undefined ? rendered : (typeof raw === "string" && num(raw) === undefined ? raw : value),
          ...(field.unit !== undefined ? { unit: field.unit } : {}),
          ...(percent !== undefined ? { percent: clamp(percent) } : {}),
          ...(resetsAt !== undefined ? { resetsAt } : {}),
        };
      });
      return { items };
    },
  };
}
