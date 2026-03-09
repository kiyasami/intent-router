import { CommandDef } from "../../../packages/core/src";

export const commands: CommandDef[] = [
  {
    id: "orders.search",
    title: "Search Orders",
    synonyms: ["order", "orders", "po", "purchase"],
    keywords: ["lookup", "history"],
  },
  {
    id: "products.brand",
    title: "Search by Brand",
    synonyms: ["brand", "manufacturer", "sumitomo", "michelin"],
    keywords: ["product", "catalog"],
  },
  {
    id: "shipments.track",
    title: "Track Shipment",
    synonyms: ["shipment", "delivery", "tracking", "ship"],
    keywords: ["status", "where is order"],
  },
  {
    id: "products.sku",
    title: "Search by SKU",
    synonyms: ["sku", "product code", "item number"],
    keywords: ["lookup", "inventory"],
  },
  {
    id: "products.size",
    title: "Search by Size",
    synonyms: ["size", "dimension", "measurement"],
    keywords: ["fit", "space"],
  },
];
