// dsh-quota-hub — host service: resolves provider credentials, fetches every
// configured quota endpoint on the host (keys never reach the browser), and
// serves normalized snapshots through a Typert Remote.
//
// Mounted as its own host-plane row (`dsh-quota-hub/stats` in
// cordis.patch.yml): the API gateway resolves Remote receivers with ctx.get
// on the host plane, so the service must be a top-level row like the core
// message-feedback service.
import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { BUILTIN_ADAPTERS, customAdapter } from "./adapters.js";

/** Optional user config file: ~/.dsh/dsh-quota-hub.json */
function loadConfigFile() {
  try {
    const home = process.env.DSH_HOME ?? joinPath(process.env.USERPROFILE ?? "", ".dsh");
    const raw = readFileSync(joinPath(home, "dsh-quota-hub.json"), "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

let QuotaHubService = class QuotaHubService extends TypertRemoteService {
  static inject = ["credentials"];

  cache = new Map(); // providerId -> { at, snapshot }
  inFlight = new Map(); // providerId -> Promise<snapshot>

  constructor(ctx, config = {}) {
    super(ctx, "quotaHub");
    this.config = config;
    this.fileConfig = loadConfigFile();
  }

  /** One built-in adapter entry (auto-detected) or a custom entry. */
  entries() {
    const extras = Array.isArray(this.config.providers) ? this.config.providers : [];
    const fileExtras = Array.isArray(this.fileConfig.providers) ? this.fileConfig.providers : [];
    const custom = [...extras, ...fileExtras].map((entry) => {
      const adapter = customAdapter(entry);
      return { id: String(entry.id), ...adapter };
    });
    const builtins = Object.entries(BUILTIN_ADAPTERS).map(([id, adapter]) => ({ id, ...adapter }));
    return [...builtins, ...custom];
  }

  refreshMs() {
    const value = this.fileConfig.refreshMs ?? this.config.refreshMs;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 10000 ? parsed : 120000;
  }

  async fetchEntry(entry) {
    const cached = this.cache.get(entry.id);
    if (cached !== undefined && Date.now() - cached.at < this.refreshMs()) return cached.snapshot;
    const pending = this.inFlight.get(entry.id);
    if (pending !== undefined) return pending;
    const task = this.fetchEntryNow(entry);
    this.inFlight.set(entry.id, task);
    try {
      const snapshot = await task;
      this.cache.set(entry.id, { at: Date.now(), snapshot });
      return snapshot;
    } finally {
      this.inFlight.delete(entry.id);
    }
  }

  async fetchEntryNow(entry) {
    let key;
    if (entry.credential !== undefined) {
      const resolved = await this.ctx.credentials.resolve(entry.credential);
      key = typeof resolved?.value === "string" && resolved.value.length > 0 ? resolved.value : undefined;
      if (key === undefined) {
        return {
          id: entry.id,
          label: entry.label,
          status: "no-key",
          items: [],
          message: `未配置密钥（credential: ${entry.credential}）`,
        };
      }
    }
    try {
      const { items } = await entry.fetch(key);
      return { id: entry.id, label: entry.label, status: "ok", items, updatedAt: Date.now() };
    } catch (error) {
      return {
        id: entry.id,
        label: entry.label,
        status: "error",
        items: [],
        message: String(error?.message ?? error).slice(0, 300),
        updatedAt: Date.now(),
      };
    }
  }

  /** Normalized snapshots for every known provider, never key material. */
  async snapshot() {
    const providers = [];
    for (const entry of this.entries()) {
      providers.push(await this.fetchEntry(entry));
    }
    return { ok: true, value: { providers } };
  }
};

Remote("snapshot")(void 0, {
  private: false,
  static: false,
  name: "snapshot",
  addInitializer(init) {
    init.call(Object.create(QuotaHubService.prototype));
  },
});

export { QuotaHubService, QuotaHubService as default };
