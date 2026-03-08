# intent-router

intent-router is a lightweight ranking engine for command palettes and application navigation. It uses deterministic browser-safe embeddings, synonyms, and optional profile boosts to rank actions/routes before rendering them in UI libraries like cmdk.

## v1 scope

- Command definition with `title`, `synonyms`, and `keywords`
- Deterministic hashed embedding in the browser
- Ranking engine with optional profile boost
- cmdk integration example

## Repository layout

```txt
intent-router/
  packages/
    core/
      src/
        index.ts
        types.ts
        embed.ts
        router.ts
        profile.ts
        score.ts
  examples/
    cmdk-demo/
      src/
        App.tsx
        commands.ts
        router.ts
```
