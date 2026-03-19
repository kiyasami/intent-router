import assert from "node:assert/strict";
import test from "node:test";

import { IntentRouter } from "../dist/index.js";

test("shared embedding namespace lets exact query terms match command text directly", () => {
  const router = new IntentRouter({
    commands: [
      {
        id: "products.brand",
        title: "Search by Brand",
        synonyms: ["brand", "manufacturer"],
      },
      {
        id: "account.profile",
        title: "Open Profile",
        synonyms: ["profile", "account"],
      },
    ],
  });

  const results = router.rank({ query: "brand", limit: 2 });

  assert.equal(results[0].id, "products.brand");
  assert.ok(results[0].breakdown.baseScore > 0);
  assert.ok(
    results[0].breakdown.baseScore > results[1].breakdown.baseScore,
    "expected the brand route to score above unrelated commands"
  );
});

test("stop words make equivalent queries rank the same way", () => {
  const router = new IntentRouter({
    commands: [
      {
        id: "products.brand",
        title: "Search by Brand",
        synonyms: ["brand", "manufacturer"],
      },
    ],
    embedOptions: {
      stopWords: ["by"],
    },
  });

  const withStopWord = router.rank({ query: "search by brand", limit: 1 })[0];
  const withoutStopWord = router.rank({ query: "search brand", limit: 1 })[0];

  assert.equal(withStopWord.id, withoutStopWord.id);
  assert.ok(
    Math.abs(withStopWord.breakdown.baseScore - withoutStopWord.breakdown.baseScore) < 1e-9,
    "expected stop word removal to produce an equivalent lexical score"
  );
});
