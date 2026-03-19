# Intent Router

Intent Router is a lightweight, local-first ranking engine for command palettes and app navigation. It plugs into UI libraries like `cmdk`, but it does not ship UI components. The package is focused on fast in-memory ranking, simple personalization, and predictable behavior in browser or server environments.

## Why use it

- Local, synchronous ranking after commands and profiles are loaded
- Hybrid lexical embeddings using words and character n-grams
- Pluggable score signals for personalization and app-specific boosts
- Optional profile persistence through your own store or provider
- No backend requirement for the core ranking loop

## How it works

1. Define the commands or routes you want to rank.
2. Intent Router embeds each command into a fixed-size vector.
3. User queries are embedded with the same model.
4. Results are ranked by vector similarity plus any configured signals.
5. After a user selects a result, you can learn from that event and persist the updated profile.

## Installation

Build the core package first:

```bash
cd packages/core
npm run build
```

Then run the demo if you want to try the package in a UI:

```bash
cd examples/cmdk-demo
npm run dev
```

## Basic ranking

```ts
import { IntentRouter } from "@intent-router/core";

const router = new IntentRouter({
  commands: [
    { id: "orders.track", title: "Track order" },
    { id: "inventory.search", title: "Search inventory" },
  ],
});

const results = router.rank({ query: "where is my order" });
```

You can also pass custom embedding options such as stop words:

```ts
const router = new IntentRouter({
  commands,
  embedOptions: {
    stopWords: ["a", "an", "the", "by", "for", "of", "to"],
  },
});
```

## Personalization flow

```ts
import {
  IntentRouter,
  LocalStorageProfileStore,
  ProfileManager,
} from "@intent-router/core";

const userId = "alice";

const router = new IntentRouter({
  commands,
  dimension: 1024,
});

const profileManager = new ProfileManager(new LocalStorageProfileStore());

const profile = await profileManager.loadProfile(userId, {
  dimension: router.getDimension(),
});

const results = router.rank({
  query: "track my shipment",
  profile,
});

router.personalize(
  {
    userId,
    query: "track my shipment",
    commandId: results[0].id,
  },
  profileManager
);

const exportedProfile = profileManager.exportProfile(userId);
```

## Route-aware commands

You can attach deep-link metadata and param expectations to commands. Intent Router can then extract likely values from the query, boost matching routes, and help you resolve a final href.

```ts
import {
  RouteCommandDef,
  createRouteCommandData,
  defineRouteCommand,
} from "@intent-router/core";

const command: RouteCommandDef = defineRouteCommand({
  id: "orders.searchByPo",
  title: "Search Orders by PO",
  data: createRouteCommandData(
    { pathname: "/orders/search" },
    [
      {
        name: "po",
        kind: "po_number",
        queryKey: "po",
        hints: ["po", "purchase order"],
      },
    ]
  ),
});
```

For more specific extraction you can use regexes, custom matchers, or the built-in helpers:

```ts
import { routeParamMatchers } from "@intent-router/core";

const command = {
  id: "products.sku",
  title: "Search by SKU",
  data: createRouteCommandData(
    { pathname: "/products/search" },
    [routeParamMatchers.sku()]
  ),
};
```

## Profile shape

```ts
interface UserProfile {
  centroids?: Record<string, number[]>;
  counts?: Record<string, number>;
  affinities?: Record<string, number>;
  metadata?: Record<string, unknown>;
}
```

- `centroids` store learned vectors per command
- `counts` track how many samples contributed to each centroid
- `affinities` provide a simple scalar preference boost
- `metadata` lets your app attach its own fields, such as pinned routes

`ProfileManager.exportProfile()` returns a JSON-safe structure, so persisting profiles is straightforward.

## Custom signals

```ts
import {
  affinitySignal,
  centroidSignal,
  IntentRouter,
  ScoreSignal,
} from "@intent-router/core";

const pinnedSignal: ScoreSignal = ({ command, profile }) => {
  const pins = profile?.metadata?.pinnedRoutes as string[] | undefined;
  return pins?.includes(command.id)
    ? { name: "pinned", score: 0.08 }
    : { name: "pinned", score: 0 };
};

const router = new IntentRouter({
  commands,
  signals: [centroidSignal, affinitySignal, pinnedSignal],
});
```

## Package layout

```text
intent-router/
  packages/
    core/        TypeScript library
  examples/
    cmdk-demo/   React + Vite demo
```

## Current focus

- Stable local-first ranking and personalization
- Publishable core package output in `packages/core/dist`
- Demo app for trying ranking behavior and profile learning

Contributions welcome.
