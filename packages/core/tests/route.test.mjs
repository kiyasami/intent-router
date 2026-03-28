import assert from "node:assert/strict";
import test from "node:test";

import {
  computeRouteParamBoost,
  createRouteParamSignal,
  IntentRouter,
  createRouteCommandData,
  resolveCommandRoute,
  resolveRouteParams,
  routeParamMatchers,
  routeParamSignal,
} from "../dist/index.js";

const routeCommands = [
  {
    id: "orders.search",
    title: "Search Orders",
    synonyms: ["order", "orders", "ord"],
    data: createRouteCommandData(
      { pathname: "/orders/search" },
      [
        {
          name: "q",
          kind: ["identifier", "number", "string"],
          queryKey: "q",
          hints: ["ord", "order", "orders"],
        },
      ]
    ),
  },
  {
    id: "orders.searchByPo",
    title: "Search Orders by PO",
    synonyms: ["po", "purchase order"],
    data: createRouteCommandData(
      { pathname: "/orders/search" },
      [routeParamMatchers.poNumber()]
    ),
  },
  {
    id: "products.sku",
    title: "Search by SKU",
    synonyms: ["sku", "product code"],
    data: createRouteCommandData(
      { pathname: "/products/search" },
      [routeParamMatchers.sku()]
    ),
  },
];

test("route param signal prefers the PO route when the query includes a PO hint", () => {
  const router = new IntentRouter({
    commands: routeCommands,
    signals: [routeParamSignal],
  });

  const results = router.rank({ query: "po 1234ds", limit: 3 });
  const resolved = resolveCommandRoute(results[0].command, "po 1234ds");

  assert.equal(results[0].id, "orders.searchByPo");
  assert.ok(
    results[0].breakdown.signalBoost > results[1].breakdown.signalBoost,
    "expected the specific PO route to receive a stronger signal boost than the generic order route"
  );
  assert.ok(resolved, "expected the ranked PO command to resolve to a deep route");
  assert.equal(resolved.href, "/orders/search?po=1234ds");
  assert.equal(resolved.params[0].value, "1234ds");
  assert.equal(resolved.params[0].source, "pattern");
  assert.ok(resolved.params[0].specificity > 0);
});

test("generic order search captures the identifier when no specific route hint is present", () => {
  const router = new IntentRouter({
    commands: routeCommands,
    signals: [routeParamSignal],
  });

  const results = router.rank({ query: "ord 1234ds", limit: 3 });
  const resolved = resolveCommandRoute(results[0].command, "ord 1234ds");

  assert.equal(results[0].id, "orders.search");
  assert.ok(resolved, "expected the generic orders route to resolve");
  assert.equal(resolved.href, "/orders/search?q=1234ds");
  assert.equal(resolved.label, "Search Orders 1234ds");
  assert.equal(resolved.params[0].source, "kind");
  assert.ok(resolved.params[0].specificity >= 0);
});

test("custom matcher takes precedence over regex and kind extraction", () => {
  const params = resolveRouteParams("po 1234ds", [
    {
      name: "po",
      kind: "po_number",
      queryKey: "po",
      pattern: /\bpo[\s:#-]*([A-Za-z0-9-]+)\b/gi,
      match: () => ({
        value: "CUSTOM-777",
        score: 0.3,
      }),
    },
  ]);

  assert.equal(params.length, 1);
  assert.equal(params[0].value, "CUSTOM-777");
  assert.equal(params[0].source, "custom");
});

test("built-in SKU matcher extracts labeled SKU values", () => {
  const resolved = resolveRouteParams("sku ABC-12345", [
    routeParamMatchers.sku(),
  ]);

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].value, "ABC-12345");
  assert.equal(resolved[0].kind, "sku");
  assert.equal(resolved[0].source, "pattern");
});

test("route scoring options allow callers to tune hint bonuses", () => {
  const command = routeCommands[1];
  const defaultBoost = computeRouteParamBoost(command, "po 1234ds");
  const customBoost = computeRouteParamBoost(command, "po 1234ds", {
    signalCap: 1,
    hintMatchedBonus: 0,
  });

  assert.equal(customBoost, defaultBoost - 0.015);
});

test("route param signal accepts scoring overrides", () => {
  const router = new IntentRouter({
    commands: routeCommands,
    signals: [
      createRouteParamSignal(
        {},
        {
          scoring: {
            signalCap: 1,
            hintMatchedBonus: 0,
          },
        }
      ),
    ],
  });

  const [result] = router.rank({ query: "po 1234ds", limit: 1 });
  const contribution = result.breakdown.signals.find(
    (signal) => signal.name === "route_params"
  );

  assert.ok(contribution, "expected a route_params contribution");
  assert.equal(contribution.score, computeRouteParamBoost(routeCommands[1], "po 1234ds", {
    signalCap: 1,
    hintMatchedBonus: 0,
  }));
});

test("built-in PO matcher accepts custom labels and hints", () => {
  const resolved = resolveRouteParams("purchase-code ABC-42", [
    routeParamMatchers.poNumber({
      labels: ["purchase-code"],
      hints: ["purchase-code"],
      includeDefaultLabels: false,
      includeDefaultHints: false,
    }),
  ]);

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].value, "ABC-42");
  assert.equal(resolved[0].kind, "po_number");
});

test("built-in item matcher extracts labeled item values", () => {
  const resolved = resolveRouteParams("line item 88x1", [
    routeParamMatchers.itemNumber(),
  ]);

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].value, "88x1");
  assert.equal(resolved[0].kind, "item_number");
  assert.equal(resolved[0].source, "pattern");
});

test("phone matcher normalizes the query value for route construction", () => {
  const command = {
    id: "account.userByPhone",
    title: "Find User by Phone",
    data: createRouteCommandData(
      { pathname: "/account/users" },
      [routeParamMatchers.phone()]
    ),
  };

  const resolved = resolveCommandRoute(command, "call +1 (555) 123-4567");

  assert.ok(resolved, "expected phone route to resolve");
  assert.equal(resolved.href, "/account/users?phone=15551234567");
  assert.equal(resolved.params[0].value, "+1 (555) 123-4567");
  assert.equal(resolved.params[0].routeValue, "15551234567");
});
