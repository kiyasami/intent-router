import assert from "node:assert/strict";
import test from "node:test";

import { IntentRouter, ProfileManager } from "../dist/index.js";

class MemoryStore {
  constructor() {
    this.map = new Map();
  }

  getLocalProfile(userId) {
    return this.map.get(userId);
  }

  setLocalProfile(userId, profile) {
    this.map.set(userId, profile);
  }

  clearLocalProfile(userId) {
    this.map.delete(userId);
  }
}

test("personalize learns centroid, count, and affinity for non-blank queries", () => {
  const router = new IntentRouter({
    commands: [{ id: "orders.search", title: "Search Orders" }],
  });
  const profileManager = new ProfileManager(new MemoryStore());

  router.personalize(
    {
      userId: "demo-user",
      query: "order status 12345",
      commandId: "orders.search",
    },
    profileManager
  );

  const profile = profileManager.getLocal("demo-user");
  assert.ok(profile, "expected a learned local profile to be stored");

  assert.equal(profile.counts["orders.search"], 1);
  assert.equal(profile.affinities["orders.search"], 1);
  assert.ok(profile.centroids["orders.search"] instanceof Float32Array);

  const ranked = router.rank({
    query: "order status 12345",
    profile,
    limit: 1,
  })[0];

  const centroidSignal = ranked.breakdown.signals.find(
    (signal) => signal.name === "centroid"
  );

  assert.ok(centroidSignal, "expected centroid signal contribution to exist");
  assert.ok(centroidSignal.score > 0);
});
