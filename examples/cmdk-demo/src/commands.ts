import { CommandDef, UserProfile } from "@intent-router/core";

export const commands: CommandDef[] = [
  {
    id: "orders.search",
    title: "Search Orders",
    synonyms: ["order", "orders", "po", "purchase order", "invoice"],
    keywords: ["lookup", "history", "customer orders", "find order"],
    group: "Orders",
  },
  {
    id: "shipments.track",
    title: "Track Shipment",
    synonyms: ["shipment", "delivery", "tracking", "track package", "ship"],
    keywords: ["status", "where is order", "carrier", "freight"],
    group: "Orders",
  },
  {
    id: "orders.invoices",
    title: "View Invoices",
    synonyms: ["invoice", "billing", "bill", "payment"],
    keywords: ["ar", "receivable", "statements"],
    group: "Orders",
  },
  {
    id: "products.brand",
    title: "Search by Brand",
    synonyms: ["brand", "manufacturer", "michelin", "goodyear", "bridgestone"],
    keywords: ["catalog", "maker", "vendor"],
    group: "Products",
  },
  {
    id: "products.size",
    title: "Search by Size",
    synonyms: ["size", "dimension", "measurement", "tire size"],
    keywords: ["fitment", "spec", "diameter", "width"],
    group: "Products",
  },
  {
    id: "products.sku",
    title: "Search by SKU",
    synonyms: ["sku", "product code", "item number", "part number"],
    keywords: ["inventory", "lookup", "catalog number"],
    group: "Products",
  },
  {
    id: "inventory.stock",
    title: "Check Inventory",
    synonyms: ["inventory", "stock", "availability", "on hand"],
    keywords: ["warehouse", "qty", "quantity"],
    group: "Products",
  },
  {
    id: "account.profile",
    title: "Open Profile",
    synonyms: ["profile", "account", "settings", "my account"],
    keywords: ["preferences", "user", "me"],
    group: "Account",
  },
  {
    id: "account.users",
    title: "Manage Users",
    synonyms: ["users", "team", "members", "permissions"],
    keywords: ["roles", "access", "admin"],
    group: "Account",
  },
  {
    id: "reports.sales",
    title: "Sales Reports",
    synonyms: ["sales", "reports", "analytics", "dashboard"],
    keywords: ["revenue", "performance", "metrics"],
    group: "Reports",
  },
];

export const scenarioQueries = [
  { label: "Exact title", query: "search orders" },
  { label: "Synonym", query: "track delivery" },
  { label: "Keyword", query: "warehouse qty" },
  { label: "Typo-ish", query: "trak shippment" },
  { label: "Brand search", query: "find michelin tires" },
  { label: "SKU search", query: "lookup product code 12345" },
  { label: "Natural language", query: "where is my order" },
  { label: "Ambiguous", query: "account settings" },
  { label: "Reports", query: "show revenue analytics" },
  { label: "Size fitment", query: "find tire size" },
];
