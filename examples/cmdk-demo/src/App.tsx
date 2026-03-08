import * as React from "react";
import { Command } from "cmdk";
import { router } from "./router";

export default function App() {
  const [query, setQuery] = React.useState("");

  const ranked = React.useMemo(() => {
    return router.rank({ query, limit: 10 });
  }, [query]);

  return (
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
            onSelect={() => {
              console.log("selected:", item.id);
            }}
          >
            {item.command.title}
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  );
}
