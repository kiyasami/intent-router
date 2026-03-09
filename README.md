# Intent Router

A lightweight ranking engine for command palettes and application navigation. It plugs into UI libraries like `cmdk` but does **not** provide any visual components itself; the focus is on a fast, predictable, and local ranking layer that can be used in browser or node contexts.

> “A frontend‑first ranking engine for command palettes and route launchers.”


## Why use Intent Router?

- **Local, synchronous scoring.** Once a profile is loaded, all ranking is done in-memory with no further I/O.
- **Hybrid lexical embedding.** Combines full‑word tokens (higher weight) with character n‑grams (lower weight) for robust matching.
- **Extensible signals.** Built‑in profile boosts plus an easy API for custom ranking signals.
- **User profiles.** Optional centroid vectors, counts, affinities, and metadata allow your app to personalize results over time.
- **Zero backend assumptions.** The core package has no storage dependencies; you can plug in your own provider if desired.


## Architecture

1. **Command definitions** supply the static actions/routes you want to rank.
2. A query string is embedded using the lexical model.
3. Each command is pre‑embedded and stored in the router.
4. The router computes a base score (dot product) and applies any configured signals.
5. Results are returned to the caller; your UI layer (e.g. `cmdk`) renders them.
6. When the user selects a command, your app can call `router.learnLocal(...)` to update the in‑memory profile and optionally persist events.


## Embedding model

- Text is normalized (lowercase, trimmed, collapsed whitespace).
- Word tokens are extracted via alphanumeric splitting; hashed with an `w:` namespace.
- Character n‑grams (default length 3) are generated over `__text__`; hashed with a `c:` namespace.
- Both token types map into a fixed‑dimensional `Float32Array` (default 1024), with separate weights.
- The resulting vector is L2‑normalized for cosine‑style dot products.


## Profile model

```ts
interface UserProfile {
  centroids?: Record<string, number[]>; // command -> normalized vector
  counts?: Record<string, number>;      // number of samples used
  affinities?: Record<string, number>;  // recency/frequency counter
  metadata?: Record<string, unknown>;   // arbitrary app data
}
```

Centroids compress the history of queries that led to each command; `counts` drive a confidence score.
Affinity values provide a simple scalar boost. Metadata can hold anything your app needs (e.g. pinned routes).

Profiles can be learned locally (`router.learnLocal`), loaded from a backend, merged, exported, and serialized to JSON.


## Getting started

Install using your workspace manager of choice; the repo is already configured with workspaces:

```bash
npm install      # or pnpm install
cd examples/cmdk-demo
npm run dev       # start the demo with Vite
```


### Basic usage

```ts
import { IntentRouter } from "@intent-router/core";

const router = new IntentRouter({
  commands: [
    { id: "foo", title: "Foo" },
    // ...
  ],
});

const results = router.rank({ query: "search term" });
```


### Cmdk integration sample

```tsx
import { Command } from "cmdk";

<Command>
  <Command.Input value={query} onValueChange={setQuery} />
  <Command.List>
    {router.rank({ query, useLocalProfile: true }).map(item => (
      <Command.Item
        key={item.id}
        onSelect={() => router.learnLocal({ query, commandId: item.id })}
      >
        {item.command.title}
        <small>{item.score.toFixed(2)}</small>
      </Command.Item>
    ))}
  </Command.List>
</Command>
```


### Profile load/export

```ts
// load previously saved profile
router.loadProfile(savedProfile);

// useLocalProfile tells `rank` to merge local history
router.rank({ query: "x", useLocalProfile: true });

// export current local profile (JSON‑serializable)
const profile = router.exportProfile();
``` 


### Custom signal example

The demo includes a simple "pinned route" signal:

```ts
const pinnedSignal: ScoreSignal = ({ command, profile }) => {
  const pins = profile.metadata?.pinnedRoutes as string[] | undefined;
  return pins?.includes(command.id) ? 0.08 : 0;
};

new IntentRouter({
  commands,
  signals: [centroidSignal, affinitySignal, pinnedSignal],
});
```

Pass any function matching the `ScoreSignal` signature to extend ranking logic.


### Why everything stays local

Once `loadProfile` has been called, all calls to `rank` and `learnLocal` operate synchronously
on in‑memory data. This keeps latency low and makes the core safe to run entirely in a web
worker or on the server if you wish.


## Project layout

```
intent-router/
  packages/
    core/          # TypeScript library, no UI deps
  examples/
    cmdk-demo/     # React + Vite demo app using cmdk
```


## Roadmap

- ✅ Basic lexical hybrid embedding + signals
- ✅ Cmdk front‑end demonstration
- ➕ Optional backend event ingestion/provider adapters
- 📦 Publish core package to npm
- 🌐 Example React/Vue/Angular wrappers
- 📈 Richer context signals (device, location, etc.)

Contributions welcome!

