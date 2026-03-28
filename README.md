# Intent Router

Intent Router is a client-side intent engine for action-first application navigation.

Instead of returning documents, it returns actions.

It takes free-text user intent, ranks possible actions (commands), applies local personalization, and resolves the winning result into a real application route. It is designed for command palettes, internal tools, workflow-heavy apps, and navigation systems where the next step matters more than document retrieval.

It helps you:

- rank actions (commands) synchronously in memory
- personalize results from user selections
- attach deep-link route metadata to actions
- extract likely route params from free-text queries
- layer custom scoring logic on top of base semantic similarity

It does not ship UI components. You can pair it with `cmdk`, your own command palette, or any search UI.

Intent Router focuses on intent-to-action, not document retrieval.

## Why use it

- Fast local ranking after commands are indexed
- Hybrid lexical embeddings built from words and character n-grams
- Predictable, debuggable scoring with base score plus named signals
- Profile learning without requiring a backend in the core loop
- Route-aware ranking for app navigation and deep links
- Extensible APIs for signals, route matching, and post-rank reranking

## Why this exists

Most application search boxes still behave like document search:

- they match keywords instead of user intent
- they return pages, records, or lists instead of the next action
- they often depend on a server roundtrip before the UI can respond

That creates friction between what the user wants and what the UI does next.

Intent Router flips that model:

- users type naturally
- the system ranks what they are trying to do
- the UI can navigate directly to the correct destination

It behaves more like a semantic router or action engine running inside the application than a traditional search box.

## Where it fits

Intent Router is especially useful in systems where:

- users navigate complex workflows
- actions matter more than content retrieval
- local-first responsiveness matters
- personalization improves efficiency over time

Common fits include:

- banking apps: transfer, account lookup, dispute cases, fraud review
- insurance systems: claims lookup, underwriting workflows, policy servicing
- internal tools: admin panels, operations consoles, support tooling
- B2B SaaS products: settings navigation, record lookup, workflow shortcuts

## How it works

1. You define commands.
2. Intent Router embeds each command into a fixed-size vector.
3. The query is embedded with the same model.
4. Commands are ranked by vector similarity.
5. Optional signals add boosts such as centroid learning, affinity, route params, or your own custom logic.
6. After a user selects a result, you can learn from that event and persist the updated profile.

```text
User Query
   ↓
Embed Query
   ↓
Rank Actions (base similarity)
   ↓
Apply Signals and Personalization
   ↓
Resolve Route and Params
   ↓
Navigate / Execute Action
```

## Repo layout

```text
intent-router/
  packages/
    core/        TypeScript library
  examples/
    cmdk-demo/   React + Vite demo
```

## Installation

If you are working in this repo:

```bash
cd packages/core
npm run build
```

To run the demo:

```bash
cd examples/cmdk-demo
npm install
npm run dev
```

If you publish the package, consumers would install it as:

```bash
npm install @intent-router/core
```

## Quick Start

```ts
import { IntentRouter } from "@intent-router/core";

const router = new IntentRouter({
  commands: [
    { id: "accounts.overview", title: "Accounts Overview" },
    { id: "payments.transfer", title: "Create Transfer" },
    { id: "cards.controls", title: "Manage Card Controls" },
  ],
});

const results = router.rank({
  query: "send money to another account",
});

console.log(results[0]?.id);
```

## Action Shape

Internally the library uses the term `command`, but you can think of commands as application actions.

Actions (commands) are simple objects:

```ts
type CommandDef = {
  id: string;
  title: string;
  synonyms?: readonly string[];
  keywords?: readonly string[];
  group?: string;
  data?: unknown;
};
```

- `title` is the strongest textual signal by default
- `synonyms` let you add alternate phrasings
- `keywords` add supporting vocabulary
- `group` is useful for UI or custom ranking logic
- `data` can hold route metadata or any app-specific payload

## Ranking Model

Every ranked result has:

- `baseScore`: vector similarity between query and command
- `signalBoost`: sum of all configured signal contributions
- `finalScore`: `baseScore + signalBoost`

That means ranking stays inspectable and tunable. You can see whether an action won because of semantic match, personalization, route extraction, or your own signal logic.

## Embedding Options

You can tune the lightweight embedding model:

```ts
const router = new IntentRouter({
  commands,
  dimension: 1024,
  embedOptions: {
    stopWords: ["a", "an", "the", "by", "for", "of", "to"],
    wordWeight: 3,
    charWeight: 1,
    charN: 3,
  },
});
```

### Dimension notes

- Lower dimensions like `256` are smaller and faster, but noisier
- Higher dimensions like `1024` preserve more distinctions, but cost more memory and network if you persist profiles
- If you store learned centroids remotely, dimension is one of the biggest cost levers

## Personalization

The built-in personalization model stores per-action learning data:

- `centroids`: learned vectors per command
- `counts`: how many examples contributed to each centroid
- `affinities`: simple scalar preference boosts
- `metadata`: app-owned fields such as pinned routes

Example flow:

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
  query: "track wire ref TRX-20491",
  profile,
});

router.personalize(
  {
    userId,
    query: "track wire ref TRX-20491",
    commandId: results[0].id,
  },
  profileManager
);

const exportedProfile = profileManager.exportProfile(userId);
```

### Personalization behavior

- `centroid` learning helps the router remember the kinds of queries that led to a specific command
- `affinity` learning helps the router prefer commands a user repeatedly chooses
- blank queries only bump affinity, not centroids

## Profile shape

```ts
interface UserProfile {
  centroids?: Record<string, number[]>;
  counts?: Record<string, number>;
  affinities?: Record<string, number>;
  metadata?: Record<string, unknown>;
}
```

`ProfileManager.exportProfile()` returns a JSON-safe structure, which makes browser storage and REST persistence straightforward.

## Route-Aware Actions

You can attach route metadata to actions so the router can:

- recognize routes as a special command category
- extract likely params from the query
- boost matching route commands
- resolve a final `href`, `pathname`, and parsed params

Example:

```ts
import {
  RouteCommandDef,
  createRouteCommandData,
  defineRouteCommand,
} from "@intent-router/core";

const command: RouteCommandDef = defineRouteCommand({
  id: "accounts.detail",
  title: "Open Account Details",
  data: createRouteCommandData(
    { pathname: "/accounts/:accountId" },
    [
      {
        name: "accountId",
        kind: "identifier",
        pathKey: "accountId",
        hints: ["account", "account number", "acct"],
        pattern: /\b(?:acct|account|account number)[\s:#-]*([A-Za-z0-9-]{4,})\b/gi,
      },
    ]
  ),
});
```

Resolving a route:

```ts
import { resolveCommandRoute } from "@intent-router/core";

const resolved = resolveCommandRoute(command, "open account 00981234");

console.log(resolved?.href);
// /accounts/00981234
```

## Built-In Route Param Matchers

The package includes helpers for common matcher shapes:

```ts
import { routeParamMatchers } from "@intent-router/core";

const customerByEmail = {
  id: "customers.byEmail",
  title: "Find Customer by Email",
  data: createRouteCommandData(
    { pathname: "/customers/search" },
    [routeParamMatchers.email({ queryKey: "email" })]
  ),
};
```

Available built-ins currently include:

- `poNumber()`
- `sku()`
- `invoiceNumber()`
- `itemNumber()`
- `email()`
- `phone()`

### Customizing built-in matcher labels and hints

Built-in matchers now accept overrides for their default vocabulary:

```ts
routeParamMatchers.poNumber({
  labels: ["purchase-code"],
  hints: ["purchase-code"],
  includeDefaultLabels: false,
  includeDefaultHints: false,
});
```

That makes it easier to adapt the matcher to your own domain language instead of being locked into the defaults.

## Route Scoring Options

Route-param extraction uses defaults, but you can tune it when needed.

Example:

```ts
import { createRouteParamSignal } from "@intent-router/core";

const router = new IntentRouter({
  commands,
  signals: [
    createRouteParamSignal(
      { routeParamWeight: 1.1 },
      {
        scoring: {
          signalCap: 0.3,
          hintBoost: 0.08,
          hintMatchedBonus: 0.02,
        },
      }
    ),
  ],
});
```

Useful knobs include:

- `signalCap`
- `hintBoost`
- `hintSpecificityBonus`
- `hintMatchedBonus`
- `extractorStopWords`
- source base scores for `custom`, `pattern`, and `kind`
- specificity bonuses

If you need full control, you can also call `resolveRouteParams`, `computeRouteParamBoost`, or `resolveCommandRoute` with route scoring options directly.

## Signals

Signals are pluggable score contributors layered on top of the base embedding score.

Built-in signal factories:

- `createCentroidSignal()`
- `createAffinitySignal()`
- `createPinnedRouteSignal()`
- `createRouteParamSignal()`

Default signals:

- centroid
- affinity

If you do not pass `signals`, the router creates the default pair for you.

If you do pass `signals`, that list fully replaces the defaults.

## Custom Signals

You are not limited to the built-ins. Any function matching `ScoreSignal` can be used.

```ts
import {
  IntentRouter,
  centroidSignal,
  affinitySignal,
  type ScoreSignal,
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

Signals receive:

- raw `query`
- `isBlankQuery`
- `queryVec`
- `command`
- `commandVec`
- `baseScore`
- `profile`

That makes it easy to write semantic gates, business-rule boosts, group boosts, or user-specific action-ranking logic.

## Tuning Built-In Signal Weights

If you are using the router's default signal stack:

```ts
const router = new IntentRouter({
  commands,
  signalWeights: {
    centroidWeight: 0.24,
    affinityWeight: 0.03,
    affinityCap: 0.1,
  },
});
```

If you are composing your own signal array, pass the same weights into the signal factories:

```ts
import {
  IntentRouter,
  createAffinitySignal,
  createCentroidSignal,
  createPinnedRouteSignal,
  createRouteParamSignal,
} from "@intent-router/core";

const weights = {
  centroidWeight: 0.24,
  affinityWeight: 0.03,
  affinityCap: 0.1,
  pinnedWeight: 0.12,
  routeParamWeight: 1.15,
};

const router = new IntentRouter({
  commands,
  signals: [
    createRouteParamSignal(weights),
    createCentroidSignal(weights),
    createAffinitySignal(weights),
    createPinnedRouteSignal(weights),
  ],
});
```

## Post-Rank Stages

`postRankStages` run after scoring and sorting. They let you rewrite the final ranked list without changing the numeric score model.

This is useful for:

- pinning or forcing commands to the top
- removing results based on app state
- deduplicating similar items
- applying last-mile business rules

Example:

```ts
const router = new IntentRouter({
  commands,
  postRankStages: [
    ({ results, isBlankQuery }) => {
      if (!isBlankQuery) return results;

      const pinned = results.filter((result) => result.command.group === "Favorites");
      const rest = results.filter((result) => result.command.group !== "Favorites");
      return [...pinned, ...rest];
    },
  ],
});
```

## Persistence Notes

- `LocalStorageProfileStore` is convenient for browser demos
- for real apps, you can provide your own store and optional provider
- `serializeProfile()` gives you JSON-safe output
- if your profiles get large, vector dimension is the first thing to evaluate

Counts and affinities are small. The centroid vectors are the main storage and payload cost.

## How this is different from traditional search

Intent Router is not trying to be a full document search engine.

It is a better fit when:

- you want to rank actions, not documents
- the UI already knows the destination routes or workflows
- low latency and local execution matter
- personalization should happen close to the interface

If your main problem is large-scale document retrieval, enterprise indexing, or relevance across millions of records, that is a different category of system. Intent Router is for intent-to-action routing inside applications.

## Common Pitfalls

### Passing a profile with the wrong dimension

Profile centroids must match the router dimension. The library throws when dimensions do not align.

### Expecting default signals and custom signals together

Passing `signals` replaces the defaults. If you want centroid and affinity plus your own signals, include them explicitly in the array.

### Confusing centroid with raw query history

The centroid is not a list of past queries. It is a learned vector summary of past queries for one command.

### Sending large learned profiles over JSON too often

JSON is convenient, but centroids can become large if you use many commands and high dimensions. For many apps this is still fine. For larger systems, consider lower dimensions, partial updates, compression, or binary storage formats.

## Current Focus

- Stable local-first ranking and personalization
- Route-aware command navigation
- A small but flexible extension surface for signals and route extraction
- Demo app for trying ranking behavior and profile learning

Contributions welcome.
