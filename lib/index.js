// dsh-quota-hub — host entry. The quota sidecar is the host-plane row
// `dsh-quota-hub/stats`; this root row exists so the typert loader can
// resolve the package's ./typert manifest (loader entries resolve package
// artifacts by their package name).
import { QuotaHubService } from "./quota-service.js";

export { QuotaHubService };
export const inject = [];
export const name = "dsh-quota-hub";

export function apply() {
  // Manifest carrier only — all logic lives in the /stats row.
}
