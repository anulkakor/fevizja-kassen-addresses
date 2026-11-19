import test from "node:test";
import assert from "node:assert/strict";
import { FeVizjaUpdateCoordinator } from "../src/index.js";

function createHarness({ initialRecord = null, failAddressPut = false, failHistoryPut = false } = {}) {
  const data = new Map();
  const calls = { addressPuts: [], historyPuts: [], alarms: 0, alarmDeletes: 0 };
  let shouldFailAddressPut = failAddressPut;

  const storage = {
    async get(key) {
      return data.get(key);
    },
    async put(keyOrObject, value) {
      const entries = typeof keyOrObject === "object"
        ? Object.entries(keyOrObject)
        : [[keyOrObject, value]];
      for (const [key, item] of entries) data.set(key, item);
    },
    async delete(key) {
      return data.delete(key);
    },
    async list({ prefix = "" } = {}) {
      return new Map([...data.entries()].filter(([key]) => key.startsWith(prefix)));
    },
    async setAlarm() {
      calls.alarms++;
    },
    async deleteAlarm() {
      calls.alarmDeletes++;
    },
  };

  const state = {
    storage,
    async blockConcurrencyWhile(callback) {
      return callback();
    },
  };

  const env = {
    ADDRESS_KV: {
      async get(key) {
        return key.startsWith("address:v1:") ? initialRecord : null;
      },
      async put(key, value) {
        calls.addressPuts.push({ key, value });
        if (shouldFailAddressPut) throw new Error("ADDRESS_KV unavailable");
      },
    },
    ADDRESS_HISTORY_KV: {
      async put(key, value, options) {
        calls.historyPuts.push({ key, value, options });
        if (failHistoryPut) throw new Error("ADDRESS_HISTORY_KV unavailable");
      },
    },
  };

  return {
    coordinator: new FeVizjaUpdateCoordinator(state, env),
    state,
    env,
    data,
    calls,
    setAddressFailure(value) {
      shouldFailAddressPut = value;
    },
  };
}

function request(payload) {
  return new Request("https://coordinator.internal/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function body(response) {
  return response.json();
}

const record = {
  insurerId: "test-kasse",
  name: "Test Krankenkasse",
  version: 1,
  updatedAt: "2026-11-19T00:00:00.000Z",
};

test("rejects requests without insurerId", async () => {
  const { coordinator } = createHarness();
  const response = await coordinator.fetch(request({ action: "read" }));

  assert.equal(response.status, 400);
  assert.equal((await body(response)).error, "insurerId_required");
});

test("returns 404 when the address record does not exist", async () => {
  const { coordinator } = createHarness();
  const response = await coordinator.fetch(request({
    action: "read",
    insurerId: "test-kasse",
  }));

  assert.equal(response.status, 404);
});

test("reads an existing record and returns its version", async () => {
  const { coordinator } = createHarness({ initialRecord: record });
  const response = await coordinator.fetch(request({
    action: "read",
    insurerId: "test-kasse",
  }));
  const result = await body(response);

  assert.equal(response.status, 200);
  assert.deepEqual(result.record, record);
  assert.equal(result.version, "1");
  assert.equal(response.headers.get("etag"), '"1"');
});

test("rejects writes with a stale expectedVersion", async () => {
  const { coordinator, calls } = createHarness({ initialRecord: record });
  const response = await coordinator.fetch(request({
    action: "write",
    insurerId: "test-kasse",
    expectedVersion: "0",
    record,
  }));
  const result = await body(response);

  assert.equal(response.status, 409);
  assert.equal(result.code, "VERSION_CONFLICT");
  assert.equal(result.currentVersion, "1");
  assert.equal(calls.addressPuts.length, 0);
  assert.equal(calls.historyPuts.length, 0);
});

test("writes a record, increments its version and commits history", async () => {
  const { coordinator, data, calls } = createHarness({ initialRecord: record });
  const updatedRecord = { ...record, name: "Updated Test Krankenkasse" };

  const response = await coordinator.fetch(request({
    action: "write",
    insurerId: "test-kasse",
    expectedVersion: "1",
    record: updatedRecord,
  }));
  const result = await body(response);

  assert.equal(response.status, 200);
  assert.equal(result.success, true);
  assert.equal(result.record.version, 2);
  assert.equal(result.projectionStatus, "committed");
  assert.equal(result.historyStatus, "committed");
  assert.equal(calls.addressPuts.length, 1);
  assert.equal(calls.historyPuts.length, 2);
  assert.equal(data.get("state:test-kasse").version, "2");
  assert.equal(data.has("pending:test-kasse"), false);

  const history = JSON.parse(calls.historyPuts[1].value);
  assert.equal(history.status, "committed");
  assert.equal(history.previous.name, record.name);
  assert.equal(history.current.name, "Updated Test Krankenkasse");
});

test("keeps the canonical record and returns 202 when ADDRESS_KV projection fails", async () => {
  const { coordinator, data, calls } = createHarness({
    initialRecord: record,
    failAddressPut: true,
  });

  const response = await coordinator.fetch(request({
    action: "write",
    insurerId: "test-kasse",
    expectedVersion: "1",
    record: { ...record, name: "Pending projection" },
  }));
  const result = await body(response);

  assert.equal(response.status, 202);
  assert.equal(result.projectionStatus, "pending");
  assert.equal(data.get("state:test-kasse").record.name, "Pending projection");
  assert.equal(data.get("pending:test-kasse"), true);
  assert.equal(calls.alarms, 2);
});

test("alarm retries a failed projection and clears its pending marker", async () => {
  const harness = createHarness({
    initialRecord: record,
    failAddressPut: true,
  });
  const { coordinator, data, calls, setAddressFailure } = harness;

  await coordinator.fetch(request({
    action: "write",
    insurerId: "test-kasse",
    expectedVersion: "1",
    record: { ...record, name: "Recovered projection" },
  }));

  assert.equal(data.has("pending:test-kasse"), true);

  setAddressFailure(false);
  await coordinator.alarm();

  assert.equal(data.has("pending:test-kasse"), false);
  assert.equal(calls.addressPuts.length, 2);
  assert.equal(calls.alarmDeletes, 1);
});

test("does not commit canonical state when the initial history write fails", async () => {
  const { coordinator, data, calls } = createHarness({
    initialRecord: record,
    failHistoryPut: true,
  });

  await assert.rejects(
    coordinator.fetch(request({
      action: "write",
      insurerId: "test-kasse",
      expectedVersion: "1",
      record: { ...record, name: "Must not commit" },
    })),
    /ADDRESS_HISTORY_KV unavailable/,
  );

  assert.equal(data.has("state:test-kasse"), false);
  assert.equal(data.has("pending:test-kasse"), false);
  assert.equal(calls.addressPuts.length, 0);
  assert.equal(calls.historyPuts.length, 1);
});

test("rejects unknown coordinator actions", async () => {
  const { coordinator } = createHarness();
  const response = await coordinator.fetch(request({
    action: "delete",
    insurerId: "test-kasse",
  }));

  assert.equal(response.status, 400);
  assert.equal((await body(response)).error, "Unknown coordinator action");
});
