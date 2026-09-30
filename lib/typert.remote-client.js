// dsh-quota-hub — hand-written Typert client Remote contribution.
import { snapshotResultSchema } from "./schemas.js";

// dsh 0.2: every strict codec needs a create() factory (memoized, as the
// official typert artifacts do).
let snapshotResultSchema$value;
const snapshotResultSchema$create = () => (snapshotResultSchema$value ??= snapshotResultSchema);

const PACKAGE = "dsh-quota-hub";

const TYPERT_REMOTE = {
  package: PACKAGE,
  descriptors: [
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
};

export default TYPERT_REMOTE;
export { TYPERT_REMOTE };
