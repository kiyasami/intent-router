import * as React from "react";
import { Command } from "cmdk";
import { router } from "./router";
import { UserProfile } from "../../../packages/core/src";

export default function App() {
  const [query, setQuery] = React.useState("");
  const [profile, setProfile] = React.useState<UserProfile>(() => router.exportProfile());

  // load profile from localStorage on startup
  React.useEffect(() => {
    const saved = localStorage.getItem("intent-router-profile");
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        router.loadProfile(obj);
        setProfile(router.exportProfile());
      } catch (e) {
        console.warn("failed to parse profile", e);
      }
    }
  }, []);

  const ranked = React.useMemo(() => {
    return router.rank({ query, limit: 10, useLocalProfile: true });
  }, [query, profile]);

  const handleSelect = (id: string) => {
    router.learnLocal({ query, commandId: id });
    const updated = router.exportProfile();
    setProfile(updated);
    localStorage.setItem("intent-router-profile", JSON.stringify(updated));
  };

  const handleExport = () => {
    const p = router.exportProfile();
    // simple alert for demo purposes
    alert(JSON.stringify(p, null, 2));
  };

  const handleReset = () => {
    router.resetProfile();
    setProfile(router.exportProfile());
    localStorage.removeItem("intent-router-profile");
  };

  const isPinned = (id: string) =>
    Array.isArray(profile.metadata?.pinnedRoutes) &&
    profile.metadata?.pinnedRoutes.includes(id);

  const togglePin = (id: string) => {
    const pins = Array.isArray(profile.metadata?.pinnedRoutes)
      ? [...profile.metadata!.pinnedRoutes!]
      : [];
    const idx = pins.indexOf(id);
    if (idx === -1) pins.push(id);
    else pins.splice(idx, 1);
    const updated: UserProfile = {
      ...profile,
      metadata: { ...(profile.metadata || {}), pinnedRoutes: pins },
    };
    router.loadProfile(updated);
    setProfile(router.exportProfile());
    localStorage.setItem("intent-router-profile", JSON.stringify(updated));
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={handleExport}>Export Profile</button>
        <button onClick={handleReset} style={{ marginLeft: 8 }}>
          Reset Profile
        </button>
      </div>
      <Command>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Type a command..."
        />
        <Command.List>
          {ranked.map((item) => (
            <Command.Item
              key={item.id}
              value={item.command.title}
              onSelect={() => handleSelect(item.id)}
            >
              <span>{item.command.title}</span>
              <span style={{ marginLeft: 8, fontSize: "0.8em", color: "#666" }}>
                {item.score.toFixed(3)}
              </span>
              <button
                style={{ marginLeft: 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(item.id);
                }}
              >
                {isPinned(item.id) ? "★" : "☆"}
              </button>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
