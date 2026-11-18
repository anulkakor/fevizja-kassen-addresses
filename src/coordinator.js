import { RECORD_PREFIX, PENDING_PREFIX } from "./constants.js";
import { clean, json } from "./utils.js";
import { historyPrefixFor, currentVersion } from "./storage.js";
export class FeVizjaUpdateCoordinator {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(request) {
    const payload = await request.json();
    const insurerId = clean(payload.insurerId);
    if (!insurerId) return json({ success: false, error: "insurerId_required" }, 400);
    return this.state.blockConcurrencyWhile(async () => {
      const stateKey = `state:${insurerId}`;
      const key = RECORD_PREFIX + insurerId;
      const durable = await this.state.storage.get(stateKey);
      const current = durable?.record ?? await this.env.ADDRESS_KV.get(key, "json");
      const currentVersionValue = durable?.version ?? currentVersion(current);

      if (payload.action === "read") {
        if (!current) return json({ success: false, error: "Address record not found", insurerId }, 404);
        return json({ success: true, record: current, version: String(currentVersionValue) }, 200, { etag: `"${currentVersionValue}"` });
      }
      if (payload.action !== "write") return json({ success: false, error: "Unknown coordinator action" }, 400);
      if (payload.expectedVersion !== String(currentVersionValue)) {
        return json({ success: false, error: "Version conflict", code: "VERSION_CONFLICT", currentVersion: String(currentVersionValue) }, 409, { etag: `"${currentVersionValue}"` });
      }

      // Legacy records without a numeric version are migrated on their first write.
      const numericVersion = Number(currentVersionValue);
      const nextVersion = Number.isSafeInteger(numericVersion) && numericVersion >= 0 ? String(numericVersion + 1) : "1";
      const record = { ...payload.record, version: Number(nextVersion) };
      const now = record.updatedAt;
      const historyKey = `${historyPrefixFor(insurerId)}${Date.now()}-${crypto.randomUUID()}`;
      const snapshot = { status: "attempted", attemptedAt: now, savedAt: now, previous: current || null, current: record };
      await this.env.ADDRESS_HISTORY_KV.put(historyKey, JSON.stringify(snapshot), { metadata: { insurerId, savedAt: now, status: "attempted" } });

      // Canonical state and its pending-projection marker are committed together.
      // KV is only a read projection and can be repaired independently per insurer.
      await this.state.storage.put({
        [stateKey]: { record, version: nextVersion },
        [`${PENDING_PREFIX}${insurerId}`]: true,
      });
      try {
        await this.state.storage.setAlarm(Date.now() + 5000);
      } catch (alarmError) {
        // Do not abort after the canonical DO commit: still attempt the KV
        // projection. If that fails, the response will expose the pending state.
        console.error("Projection alarm could not be scheduled before KV projection", { insurerId, message: String(alarmError) });
      }

      let projectionStatus = "committed";
      try {
        await this.env.ADDRESS_KV.put(key, JSON.stringify(record));
        await this.state.storage.delete(`${PENDING_PREFIX}${insurerId}`);
        const remaining = await this.state.storage.list({ prefix: PENDING_PREFIX, limit: 1000 });
        if (remaining.size === 0) await this.state.storage.deleteAlarm();
      } catch (error) {
        projectionStatus = "pending";
        console.error("Address KV projection failed", { insurerId, message: String(error) });
        try { await this.state.storage.setAlarm(Date.now() + 30000); } catch (alarmError) {
          console.error("Projection retry alarm could not be rescheduled", { insurerId, message: String(alarmError) });
        }
      }

      let historyStatus = "committed";
      try {
        snapshot.status = "committed";
        snapshot.committedAt = new Date().toISOString();
        await this.env.ADDRESS_HISTORY_KV.put(historyKey, JSON.stringify(snapshot), { metadata: { insurerId, savedAt: now, status: "committed" } });
      } catch (error) {
        historyStatus = "attempted";
        console.error("History commit marker failed", { insurerId, message: String(error) });
      }
      const status = projectionStatus === "pending" ? 202 : 200;
      return json({ success: true, record, historyStatus, projectionStatus, etag: nextVersion }, status, { etag: `"${nextVersion}"` });
    });
  }

  async alarm() {
    return this.state.blockConcurrencyWhile(async () => {
      const pending = await this.state.storage.list({ prefix: PENDING_PREFIX, limit: 1000 });
      let failed = false;
      for (const [pendingKey] of pending) {
        const insurerId = pendingKey.slice(PENDING_PREFIX.length);
        const durable = await this.state.storage.get(`state:${insurerId}`);
        if (!durable?.record) {
          await this.state.storage.delete(pendingKey);
          continue;
        }
        try {
          await this.env.ADDRESS_KV.put(RECORD_PREFIX + insurerId, JSON.stringify(durable.record));
          await this.state.storage.delete(pendingKey);
        } catch (error) {
          failed = true;
          console.error("Address KV projection retry failed", { insurerId, message: String(error) });
        }
      }
      const remaining = await this.state.storage.list({ prefix: PENDING_PREFIX, limit: 1000 });
      if (failed || remaining.size > 0) await this.state.storage.setAlarm(Date.now() + 30000);
      else await this.state.storage.deleteAlarm();
    });
  }
}
