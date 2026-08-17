// dsh-quota-hub — wire zod schemas shared by the host Typert manifest and
// the Remote client contribution.
import { z } from "zod";

/** One key/value line of a provider snapshot (value, or percent + reset). */
export const quotaItemSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().max(120),
  value: z.union([z.number(), z.string()]).optional(),
  unit: z.string().max(12).optional(),
  percent: z.number().min(0).max(100).optional(),
  resetsAt: z.string().optional(),
});

export const providerSnapshotSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().max(120),
  status: z.enum(["ok", "error", "no-key"]),
  message: z.string().max(300).optional(),
  items: z.array(quotaItemSchema),
  updatedAt: z.number().int().positive().optional(),
});

/**
 * Business result of `snapshot`. Same envelope convention as core Remote
 * services: the transport adds its own {ok, value} carrier on top.
 */
export const snapshotResultSchema = z.union([
  z.object({ ok: z.literal(true), value: z.object({ providers: z.array(providerSnapshotSchema) }) }),
  z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string().optional() }) }),
]);
