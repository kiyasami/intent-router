import {
  RouteCommandDef,
  createRouteCommandData,
  defineRouteCommand,
  routeParamMatchers,
} from "@intent-router/core";

export const commands: RouteCommandDef[] = [
  defineRouteCommand({
    id: "orders.search",
    title: "Search Orders",
    synonyms: ["order", "orders", "ord", "order lookup"],
    keywords: ["lookup", "history", "customer orders", "find order"],
    group: "Orders",
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
  }),
  defineRouteCommand({
    id: "orders.searchByPo",
    title: "Search Orders by PO",
    synonyms: ["po", "purchase order", "order po"],
    keywords: ["lookup po", "find po", "po number"],
    group: "Orders",
    data: createRouteCommandData(
      { pathname: "/orders/search" },
      [routeParamMatchers.poNumber()]
    ),
  }),
  defineRouteCommand({
    id: "orders.searchByItem",
    title: "Search Orders by Item",
    synonyms: ["item", "item number", "order item"],
    keywords: ["item lookup", "find item", "line item"],
    group: "Orders",
    data: createRouteCommandData(
      { pathname: "/orders/search" },
      [
        {
          name: "item",
          kind: "item_number",
          queryKey: "item",
          hints: ["item", "item number"],
          pattern: /\b(?:item|item number|line item)[\s:#-]*([A-Za-z0-9-]+)\b/gi,
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "orders.searchByInvoice",
    title: "Search Orders by Invoice",
    synonyms: ["invoice", "inv", "billing invoice"],
    keywords: ["invoice lookup", "find invoice"],
    group: "Orders",
    data: createRouteCommandData(
      { pathname: "/orders/search" },
      [routeParamMatchers.invoiceNumber()]
    ),
  }),
  defineRouteCommand({
    id: "shipments.track",
    title: "Track Shipment",
    synonyms: ["shipment", "delivery", "tracking", "track package", "ship"],
    keywords: ["status", "where is order", "carrier", "freight"],
    group: "Orders",
    data: createRouteCommandData(
      { pathname: "/shipments/track" },
      [
        {
          name: "tracking",
          kind: "identifier",
          queryKey: "tracking",
          hints: ["track", "tracking", "shipment"],
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "orders.invoices",
    title: "View Invoices",
    synonyms: ["invoice", "billing", "bill", "payment"],
    keywords: ["ar", "receivable", "statements"],
    group: "Orders",
    data: createRouteCommandData({ pathname: "/orders/invoices" }),
  }),
  defineRouteCommand({
    id: "products.brand",
    title: "Search by Brand",
    synonyms: ["brand", "manufacturer", "michelin", "goodyear", "bridgestone"],
    keywords: ["catalog", "maker", "vendor"],
    group: "Products",
    data: createRouteCommandData(
      { pathname: "/products/search" },
      [
        {
          name: "brand",
          kind: "string",
          queryKey: "brand",
          hints: ["brand", "manufacturer", "maker"],
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "products.size",
    title: "Search by Size",
    synonyms: ["size", "dimension", "measurement", "tire size"],
    keywords: ["fitment", "spec", "diameter", "width"],
    group: "Products",
    data: createRouteCommandData(
      { pathname: "/products/search" },
      [
        {
          name: "size",
          kind: "identifier",
          queryKey: "size",
          hints: ["size", "fitment"],
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "products.sku",
    title: "Search by SKU",
    synonyms: ["sku", "product code", "item number", "part number"],
    keywords: ["inventory", "lookup", "catalog number"],
    group: "Products",
    data: createRouteCommandData(
      { pathname: "/products/search" },
      [routeParamMatchers.sku()]
    ),
  }),
  defineRouteCommand({
    id: "inventory.stock",
    title: "Check Inventory",
    synonyms: ["inventory", "stock", "availability", "on hand"],
    keywords: ["warehouse", "qty", "quantity"],
    group: "Products",
    data: createRouteCommandData(
      { pathname: "/inventory" },
      [
        {
          name: "q",
          kind: ["identifier", "number", "string"],
          queryKey: "q",
          hints: ["inventory", "stock", "qty"],
        },
      ]
    ),
  }),
  defineRouteCommand({
    id: "account.profile",
    title: "Open Profile",
    synonyms: ["profile", "account", "settings", "my account"],
    keywords: ["preferences", "user", "me"],
    group: "Account",
    data: createRouteCommandData({ pathname: "/account/profile" }),
  }),
  defineRouteCommand({
    id: "account.users",
    title: "Manage Users",
    synonyms: ["users", "team", "members", "permissions"],
    keywords: ["roles", "access", "admin"],
    group: "Account",
    data: createRouteCommandData({ pathname: "/account/users" }),
  }),
  defineRouteCommand({
    id: "account.userByEmail",
    title: "Find User by Email",
    synonyms: ["email user", "user email", "find email"],
    keywords: ["lookup email", "contact email"],
    group: "Account",
    data: createRouteCommandData(
      { pathname: "/account/users" },
      [routeParamMatchers.email()]
    ),
  }),
  defineRouteCommand({
    id: "account.userByPhone",
    title: "Find User by Phone",
    synonyms: ["phone user", "mobile", "cell"],
    keywords: ["lookup phone", "contact number"],
    group: "Account",
    data: createRouteCommandData(
      { pathname: "/account/users" },
      [routeParamMatchers.phone()]
    ),
  }),
  defineRouteCommand({
    id: "reports.sales",
    title: "Sales Reports",
    synonyms: ["sales", "reports", "analytics", "dashboard"],
    keywords: ["revenue", "performance", "metrics"],
    group: "Reports",
    data: createRouteCommandData({ pathname: "/reports/sales" }),
  }),
];

export const scenarioQueries = [
  { label: "Exact title", query: "search orders" },
  { label: "Order code", query: "ord 1234ds" },
  { label: "PO route", query: "po 1234ds" },
  { label: "Item route", query: "item 88x1" },
  { label: "Invoice route", query: "invoice INV-44321" },
  { label: "Shipment", query: "track zx9001" },
  { label: "Brand search", query: "find michelin tires" },
  { label: "SKU search", query: "sku ABC-12345" },
  { label: "Email route", query: "user jane@example.com" },
  { label: "Phone route", query: "call +1 (555) 123-4567" },
];
