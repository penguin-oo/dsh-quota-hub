// dsh-quota-hub — hand-written Typert host manifest for the quota service.
// Consumed by @deepseek-ai/dsh-typert-loader.
import { z } from "zod";
import { snapshotResultSchema } from "./schemas.js";

// dsh 0.2: every strict codec needs a create() factory (memoized, as the
// official typert artifacts do).
let snapshotResultSchema$value;
const snapshotResultSchema$create = () => (snapshotResultSchema$value ??= snapshotResultSchema);

const PACKAGE = "dsh-quota-hub";

export const TYPERT = {
  package: PACKAGE,
  face: "host",
  schemas: [],
  invocations: [
    {
      id: `${PACKAGE}#quotaHub/snapshot`,
      service: "quotaHub",
      namespace: "quotaHub",
      method: "snapshot",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: `${PACKAGE}#SnapshotResult`,
        create: snapshotResultSchema$create,
      },
      sourceLocation: { file: "lib/quota-service.js", line: 1, column: 1 },
    },
  ],
  model: {
    services: [
      {
        key: "quotaHub",
        exportName: "QuotaHubService",
        tags: [],
        description:
          "Read-only sidecar that fetches provider quota/balance snapshots on the host and serves them to the client panel. Never exposes API keys.",
        summary: "Provider quota snapshot reader.",
        jsDoc: "/**\n * Read-only provider-quota snapshot sidecar.\n */",
        members: [
          {
            kind: "method",
            name: "snapshot",
            signature: "@Remote('snapshot') snapshot(): SnapshotResult",
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
};
