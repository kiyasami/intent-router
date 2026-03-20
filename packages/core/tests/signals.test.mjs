import assert from "node:assert/strict";
import test from "node:test";

import {
  createPinnedRouteSignal,
  IntentRouter,
  ProfileManager,
} from "../dist/index.js";

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

test("signalWeights can disable the default centroid and affinity signals", () => {
  const commands = [{ id: "orders.search", title: "Search Orders" }];
  const learnedRouter = new IntentRouter({ commands });
  const profileManager = new ProfileManager(new MemoryStore());

  learnedRouter.personalize(
    {
      userId: "demo-user",
      query: "order status 12345",
      commandId: "orders.search",
    },
    profileManager
  );

  const profile = profileManager.getLocal("demo-user");
  const tunedRouter = new IntentRouter({
    commands,
    signalWeights: {
      centroidWeight: 0,
      affinityWeight: 0,
      affinityCap: 0,
    },
  });

  const ranked = tunedRouter.rank({
    query: "order status 12345",
    profile,
    limit: 1,
  })[0];

  assert.equal(ranked.breakdown.signalBoost, 0);
  assert.ok(
    ranked.breakdown.signals.every((signal) => signal.score === 0),
    "expected built-in default signals to respect zeroed weights"
  );
});

test("built-in signal factories accept custom weights for explicit signal arrays", () => {
  const pinnedSignal = createPinnedRouteSignal({ pinnedWeight: 0.2 });
  const score = pinnedSignal({
    query: "",
    isBlankQuery: true,
    queryVec: new Float32Array(8),
    command: { id: "orders.search", title: "Search Orders" },
    commandVec: new Float32Array(8),
    baseScore: 0,
    profile: {
      metadata: {
        pinnedRoutes: ["orders.search"],
      },
    },
  });

  assert.equal(score.name, "pinned");
  assert.equal(score.score, 0.2);
});
