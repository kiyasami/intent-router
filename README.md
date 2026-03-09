intent-router

A lightweight client-side intent router for command palettes and global search.

It combines hybrid lexical embeddings, user behavior learning, and pluggable ranking signals to intelligently route user queries to application actions.

Designed for:

command palettes (cmdk, Spotlight-style UIs)

global navigation search

intent routing inside web apps

lightweight personalization without a server

Everything runs fully in the browser with zero dependencies on ML frameworks or vector databases.

Why intent-router?

Traditional command palettes rely on:

string matching

manual ranking

static keyword lists

Intent Router introduces a ranking engine that:

understands natural language queries

learns from user selections

adapts results over time

remains fast enough for per-keystroke execution in the browser

Typical latency:

<1ms for ~50 commands
<5ms for ~200 commands
Core Concepts
Commands

Commands represent application actions.

type CommandDef = {
  id: string
  title: string
  synonyms?: string[]
  keywords?: string[]
  group?: string
  data?: unknown
}

Example:

{
  id: "orders.history",
  title: "Order History",
  synonyms: ["past orders", "previous purchases"],
  keywords: ["orders", "history", "purchases"],
  group: "orders"
}
Hybrid Embedding Model

Intent Router uses a deterministic hybrid embedding.

It combines:

• word tokens (semantic intent)
• character n-grams (robust to typos)

Example query:

ord hist

still matches:

Order History

because character grams overlap.

Field-aware weighting

Command fields contribute with different weights:

title      → strongest signal
synonyms   → medium signal
keywords   → weaker signal

Internally:

title weight     ≈ 3.0
synonyms weight  ≈ 1.5
keywords weight  ≈ 1.0

Vectors are normalized so dot-product similarity works as cosine similarity.

Ranking Pipeline

Ranking follows this pipeline:

query
 ↓
embed(query)
 ↓
base similarity (dot product)
 ↓
signal boosts
 ↓
post-rank stages
 ↓
final ranked commands
Final score
finalScore = baseScore + signalBoost

Signals provide behavioral and contextual ranking adjustments.

Signals (Ranking Features)

Signals are pluggable scoring functions.

type ScoreSignal = (args: ScoreSignalArgs) =>
  | number
  | { name?: string; score: number }

Built-in signals:

centroidSignal

Boosts commands similar to past user queries.

Learns a centroid vector for each command based on past selections.

affinitySignal

Boosts commands frequently selected by the user.

Uses a logarithmic scale so large counts do not dominate.

Post-Rank Stages

After scoring, optional post-rank stages can reshape results.

Examples:

• pin routes to top
• enforce group diversity
• apply business rules

Example stage:

const pinnedFirstStage: PostRankStage = ({ results, profile }) => {
  const pinned = profile?.metadata?.pinnedRoutes ?? []

  return [...results].sort((a, b) => {
    const aPinned = pinned.includes(a.id)
    const bPinned = pinned.includes(b.id)

    return Number(bPinned) - Number(aPinned)
  })
}
Personalization Model

The router can learn from user selections.

A profile stores:

centroids   → learned query vectors
counts      → centroid confidence
affinities  → selection frequency
metadata    → custom application data

Example profile:

{
  centroids: {
    "orders.history": Float32Array(...)
  },
  counts: {
    "orders.history": 4
  },
  affinities: {
    "orders.history": 7
  }
}
Blank Query Behavior

When the query is empty:

baseScore = 0

Results are ranked only by signals.

This allows command palettes to show:

frequently used routes

pinned routes

personalized suggestions

Learning From Selections

Selections update the user profile.

router.learnLocal({
  query: "order history",
  commandId: "orders.history"
})

If the query is blank, only affinity is updated (no centroid learning).

Example
import { IntentRouter } from "@intent-router/core"

const router = new IntentRouter({
  commands: [
    {
      id: "orders.history",
      title: "Order History",
      synonyms: ["past orders"]
    },
    {
      id: "orders.search",
      title: "Search Orders"
    }
  ]
})

router.rank({
  query: "past orders"
})

Result:

[
  { id: "orders.history", score: 0.81 },
  { id: "orders.search", score: 0.34 }
]
Explainable Ranking

Each result includes a score breakdown.

{
  score: 0.83,
  breakdown: {
    baseScore: 0.72,
    signalBoost: 0.11,
    signals: [
      { name: "centroid", score: 0.08 },
      { name: "affinity", score: 0.03 }
    ]
  }
}

This makes tuning signals easy.

Updating Commands

Commands can be refreshed without recreating the router.

router.setCommands(commands)

Or appended:

router.addCommands(newCommands)
Performance

Typical performance on modern browsers:

Commands	Time per query
50	<1ms
200	~3-5ms
500	~10ms

This makes the router safe to run on every keystroke.

Demo

The repository includes a cmdk command palette demo.

examples/cmdk-demo

The demo shows:

real-time ranking

profile learning

blank query recommendations

signal debugging

Roadmap

Potential future improvements:

optional BM25 lexical scoring

configurable embedding dimensions

signal weighting configuration

offline profile persistence

telemetry hooks

License

MIT