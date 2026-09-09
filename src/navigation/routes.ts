export type SectionName = "situations" | "softs" | "phrases";

export type Route =
  | { name: SectionName }
  | { name: "situation"; id: string }
  | { name: "soft"; id: string }
  | { name: "phrase"; id: string }
  | { name: "notepad" }
  | { name: "calculator" }
  | { name: "menu" };

export const SECTION_NAMES: readonly SectionName[] = ["situations", "softs", "phrases"];

export function isSection(route: Route): route is { name: SectionName } {
  return SECTION_NAMES.some((name) => name === route.name);
}

export function routeKey(route: Route): string {
  return "id" in route ? `${route.name}:${route.id}` : route.name;
}
