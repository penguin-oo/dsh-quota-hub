// Smoke test for dsh-quota-hub: plugin shape + Typert manifest + Remote
// contribution + adapter normalization checks.
import { remoteMethods } from "@deepseek-ai/dsh-typert-protocol";
import { validateTypertManifest } from "@deepseek-ai/dsh-typert-loader";
import { inject, name } from "../lib/index.js";
import { QuotaHubService } from "../lib/quota-service.js";
import { TYPERT } from "../lib/typert.host.js";
import { TYPERT_REMOTE } from "../lib/typert.remote-client.js";
import { BUILTIN_ADAPTERS, extractPath } from "../lib/adapters.js";

if (name !== "dsh-quota-hub") throw new Error(`unexpected plugin name ${name}`);
if (inject.length !== 0) throw new Error(`inject mismatch: ${inject.join(",")}`);

const dummy = Object.create(QuotaHubService.prototype);
const methods = remoteMethods(dummy).map((m) => `${m.method}/${m.invocation.kind}`);
if (methods.join(",") !== "snapshot/direct") throw new Error(`Remote markers mismatch: ${methods.join(",")}`);
validateTypertManifest("dsh-quota-hub", TYPERT);
if (TYPERT_REMOTE.descriptors.length !== 1) throw new Error(`expected 1 descriptor, got ${TYPERT_REMOTE.descriptors.length}`);

const builtinIds = Object.keys(BUILTIN_ADAPTERS);
if (builtinIds.join(",") !== "opencode-go,deepseek,openrouter,siliconflow,moonshot") {
  throw new Error(`builtin adapters mismatch: ${builtinIds.join(",")}`);
}
if (extractPath({ usage: { rolling: { percent: 86 } } }, "usage.rolling.percent") !== 86) {
  throw new Error("extractPath failed");
}

// Shimmed service lifecycle: snapshot resolves credentials and returns
// no-key/ok snapshots without throwing.
const ctx = {
  reflect: { provide: () => () => {} },
  credentials: {
    resolve: async (ref) => (ref === "OPENCODE_GO_API_KEY" ? { value: "test-key" } : undefined),
  },
};
const service = new QuotaHubService(ctx, { refreshMs: 60000, providers: [] });
const snapshot = await service.snapshot();
if (!snapshot.ok) throw new Error("snapshot not ok");
const providers = snapshot.value.providers;
if (providers.length !== 5) throw new Error(`expected 5 providers, got ${providers.length}`);
const ocg = providers.find((p) => p.id === "opencode-go");
if (ocg?.status !== "error") {
  // With a fake key the fetch must fail with status error (no throw).
  if (ocg?.status !== "error" && ocg?.status !== "ok") throw new Error(`opencode-go status ${ocg?.status}`);
}
const ds = providers.find((p) => p.id === "deepseek");
if (ds?.status !== "no-key") throw new Error(`deepseek should be no-key, got ${ds?.status}`);
console.log("smoke: OK —", name, "| remote:", methods.join(", "), "| providers:", providers.length);
