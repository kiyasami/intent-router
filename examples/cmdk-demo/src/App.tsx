import * as React from "react";
import { Command } from "cmdk";
import {
  ApiProfileProvider,
  LocalStorageProfileStore,
  ProfileManager,
  RankedCommand,
  RouteCommandData,
  UserProfile,
  resolveCommandRoute,
} from "@intent-router/core";
import { DEFAULT_LIST_LIMIT, STORAGE_KEY } from "./constants";
import { router } from "./router";
import { styles } from "./styles";
import { scenarioQueries } from "./commands";
import { pretty, scoreClass } from "./utils";

function formatSignalName(name: string): string {
  return name.replace(/_/g, " ");
}

export default function App() {
  const userId = "demo-user";
  const profileStore = React.useMemo(() => new LocalStorageProfileStore(), []);
  const profileProvider = React.useMemo(() => new ApiProfileProvider(), []);
  const profileManager = React.useMemo(
    () => new ProfileManager(profileStore, profileProvider),
    [profileStore, profileProvider]
  );

  React.useEffect(() => {
    const existingProfile = profileManager.getLocal(userId);
    profileManager
      .loadProfile(userId, { dimension: router.getDimension() })
      .then((profile) => {
        if (!existingProfile) {
          profileManager.setLocal(userId, profile, {
            dimension: router.getDimension(),
          });
        }
      });
  }, [profileManager, userId]);

  const [query, setQuery] = React.useState("");
  const [refreshed, setRefreshed] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedResult, setSelectedResult] = React.useState<RankedCommand<RouteCommandData> | null>(null);
  const [useLocalProfile, setUseLocalProfile] = React.useState(true);
  const storedProfile = profileManager.getLocal(userId);
  const localProfile = React.useMemo<UserProfile>(() => {
    if (!storedProfile || !useLocalProfile) {
      return {
        counts: {},
        affinities: {},
        centroids: {},
        metadata: {
          pinnedRoutes: [],
        },
      };
    }

    return storedProfile;
  }, [refreshed, storedProfile, useLocalProfile]);

  const localCounts = localProfile.counts ?? {};
  const localAffinities = localProfile.affinities ?? {};
  const localCentroids = localProfile.centroids ?? {};
  const [limit, setLimit] = React.useState(DEFAULT_LIST_LIMIT);
  const [learnAffinityDelta, setLearnAffinityDelta] = React.useState(1);

  const results = React.useMemo(
    () =>
      router.rank({
        query,
        limit,
        profile: localProfile,
      }),
    [limit, localProfile, query]
  );

  const selectedRoute = React.useMemo(
    () =>
      selectedResult
        ? resolveCommandRoute(selectedResult.command, query)
        : null,
    [query, selectedResult]
  );

  React.useEffect(() => {
    const next = results.find((r) => r.id === selectedId) ?? null;
    setSelectedResult(next);
  }, [results, selectedId]);

  const refreshLocalProfile = React.useCallback(async () => {
    const updated = await profileManager.loadProfile(userId, {
      dimension: router.getDimension(),
    });

    profileManager.setLocal(userId, updated, {
      dimension: router.getDimension(),
    });
    setRefreshed((value) => !value);
  }, [profileManager, userId]);

  const handleSelect = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      router.personalize(
        {
          userId,
          query,
          commandId: id,
          affinityDelta: learnAffinityDelta,
        },
        profileManager
      );
      setRefreshed((value) => !value);
    },
    [learnAffinityDelta, profileManager, query, userId]
  );

  const handleResetLocal = React.useCallback(() => {
    profileManager.resetLocal(userId);
    refreshLocalProfile();
    setSelectedId(null);
    setSelectedResult(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [profileManager, refreshLocalProfile, userId]);

  const togglePin = React.useCallback(
    (commandId: string) => {
      const current = localProfile;
      const pins = Array.isArray(current.metadata?.pinnedRoutes)
        ? [...(current.metadata?.pinnedRoutes as string[])]
        : [];

      const idx = pins.indexOf(commandId);
      if (idx >= 0) pins.splice(idx, 1);
      else pins.push(commandId);

      const next: UserProfile = {
        ...current,
        metadata: {
          ...(current.metadata ?? {}),
          pinnedRoutes: pins,
        },
      };

      profileManager.setLocal(userId, next, {
        dimension: router.getDimension(),
      });
      setRefreshed((value) => !value);
    },
    [localProfile, profileManager, userId]
  );

  const localPins = Array.isArray(localProfile.metadata?.pinnedRoutes)
    ? (localProfile.metadata?.pinnedRoutes as string[])
    : [];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Intent Router Lab</h1>
          <p style={styles.sub}>
            Minimal cmdk playground for testing lexical match, profile learning,
            centroid/affinity boosts, pinning, import/export, and score breakdowns.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.leftCol}>
          <div style={styles.card}>
            <div style={styles.rowBetween}>
              <strong>Scenario quick tests</strong>
              <span style={styles.muted}>Click to populate query</span>
            </div>

            <div style={styles.scenarioWrap}>
              {scenarioQueries.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setQuery(s.query)}
                  style={styles.scenarioButton}
                >
                  {s.label}: <span style={styles.codeInline}>{s.query}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ marginBottom: 12 }}>
              <strong>Search lab</strong>
            </div>

            <div style={styles.controls}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={useLocalProfile}
                  onChange={(e) => setUseLocalProfile(e.target.checked)}
                />
                Use local profile in rank()
              </label>

              <label style={styles.inlineField}>
                Limit
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value || 8))}
                  style={styles.smallInput}
                />
              </label>

              <label style={styles.inlineField}>
                affinityDelta on learn
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={learnAffinityDelta}
                  onChange={(e) =>
                    setLearnAffinityDelta(Number(e.target.value || 1))
                  }
                  style={styles.smallInput}
                />
              </label>
            </div>

            <Command
              label="Intent Router Lab"
              shouldFilter={false}
              style={styles.cmdkRoot}
            >
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Type queries like: where is my order, track delivery, michelin, sku, warehouse qty..."
                style={styles.input}
              />
              <Command.List style={styles.list}>
                {results.length === 0 ? (
                  <Command.Empty style={styles.empty}>
                    No matches
                  </Command.Empty>
                ) : (
                  results.map((item, index) => {
                    const pinned = localPins.includes(item.id);
                    const selected = selectedId === item.id;
                    const resolvedRoute = resolveCommandRoute(item.command, query);

                    return (
                      <Command.Item
                        key={item.id}
                        value={`${item.id} ${item.command.title}`}
                        onSelect={() => handleSelect(item.id)}
                        style={{
                          ...styles.item,
                          ...(selected ? styles.itemSelected : {}),
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={styles.rowBetween}>
                            <div>
                              <strong>
                                #{index + 1} {item.command.title}
                              </strong>
                              <div style={styles.mutedSmall}>{item.id}</div>
                            </div>

                            <div style={styles.scoreBlock}>
                              <span
                                style={{
                                  ...styles.scoreBadge,
                                  ...(scoreClass(item.score) === "good"
                                    ? styles.scoreGood
                                    : scoreClass(item.score) === "mid"
                                    ? styles.scoreMid
                                    : styles.scoreLow),
                                }}
                              >
                                total {item.score.toFixed(3)}
                              </span>
                            </div>
                          </div>

                          <div style={styles.breakdown}>
                            <span>base: {item.breakdown.baseScore.toFixed(3)}</span>
                            <span>
                              signal: {item.breakdown.signalBoost.toFixed(3)}
                            </span>
                            <span>
                              local count: {localCounts[item.id] ?? 0}
                            </span>
                            <span>
                              local affinity: {localAffinities[item.id] ?? 0}
                            </span>
                            <span>
                              centroid: {(localCounts[item.id] ?? 0) > 0 ? "yes" : "no"}
                            </span>
                            <span>pinned: {pinned ? "yes" : "no"}</span>
                          </div>

                          <div style={styles.signalList}>
                            {item.breakdown.signals.map((signal) => (
                              <span
                                key={signal.name}
                                style={{
                                  ...styles.signalPill,
                                  ...(signal.score > 0
                                    ? styles.signalPillActive
                                    : styles.signalPillMuted),
                                }}
                              >
                                {formatSignalName(signal.name)} {signal.score.toFixed(3)}
                              </span>
                            ))}
                          </div>

                          <div style={styles.metaRow}>
                            <span>
                              group: {item.command.group ?? "ungrouped"}
                            </span>
                            <span>
                              synonyms:{" "}
                              {(item.command.synonyms ?? []).join(", ") || "-"}
                            </span>
                            <span>
                              route: {resolvedRoute?.href ?? item.command.data?.route.pathname ?? "-"}
                            </span>
                          </div>
                        </div>

                        <button
                          style={styles.pinButton}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePin(item.id);
                          }}
                        >
                          {pinned ? "unpin" : "pin"}
                        </button>
                      </Command.Item>
                    );
                  })
                )}
              </Command.List>
            </Command>
          </div>
        </section>

        <section style={styles.rightCol}>
          <div style={styles.card}>
            <div style={styles.rowBetween}>
              <strong>Selected result details</strong>
              <span style={styles.muted}>Updates after each click/learn</span>
            </div>

            {selectedResult ? (
              <div style={styles.details}>
                <div>
                  <div style={styles.kvLabel}>Title</div>
                  <div>{selectedResult.command.title}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>ID</div>
                  <div>{selectedResult.id}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Base score</div>
                  <div>{selectedResult.breakdown.baseScore.toFixed(6)}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Signal boost</div>
                  <div>{selectedResult.breakdown.signalBoost.toFixed(6)}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Total</div>
                  <div>{selectedResult.score.toFixed(6)}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Local count</div>
                  <div>{localCounts[selectedResult.id] ?? 0}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Local affinity</div>
                  <div>{localAffinities[selectedResult.id] ?? 0}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Has centroid</div>
                  <div>{(localCounts[selectedResult.id] ?? 0) > 0 ? "yes" : "no"}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Resolved route</div>
                  <div>{selectedRoute?.href ?? selectedResult.command.data?.route.pathname ?? "-"}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Route label</div>
                  <div>{selectedRoute?.label ?? selectedResult.command.title}</div>
                </div>
                <div>
                  <div style={styles.kvLabel}>Route params</div>
                  <div>
                    {selectedRoute?.params.length
                      ? selectedRoute.params
                          .map((param) => `${param.name}=${param.value} [${param.source}]`)
                          .join(", ")
                      : "-"}
                  </div>
                </div>
                <div style={styles.detailWide}>
                  <div style={styles.kvLabel}>Signal contributions</div>
                  <div style={styles.signalList}>
                    {selectedResult.breakdown.signals.map((signal) => (
                      <span
                        key={signal.name}
                        style={{
                          ...styles.signalPill,
                          ...(signal.score > 0
                            ? styles.signalPillActive
                            : styles.signalPillMuted),
                        }}
                      >
                        {formatSignalName(signal.name)} {signal.score.toFixed(6)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.emptyBox}>
                Click any ranked item to learn it and inspect profile effects.
              </div>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.rowBetween}>
              <strong>Local profile controls</strong>
              <span style={styles.muted}>Good for forcing edge cases</span>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={handleResetLocal} style={styles.button}>
                reset local profile
              </button>
            </div>

            <pre style={styles.pre}>{pretty(localProfile)}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}
