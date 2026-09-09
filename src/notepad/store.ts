import { createStore } from "../lib/createStore";
import { writeStored } from "../lib/storage";

export type Client = {
  id: string;
  name: string;
  note: string;
};

export type NotepadState = {
  clients: Client[];
  activeId: string;
};

const CLIENT_NAME_PATTERN = /^Клиент (\d+)$/;

function createClient(name: string): Client {
  return { id: crypto.randomUUID(), name, note: "" };
}

function createDefaultState(): NotepadState {
  const client = createClient("Клиент 1");
  return { clients: [client], activeId: client.id };
}

function parseClient(raw: unknown): Client | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { id, name, note } = raw as Record<string, unknown>;
  if (typeof id !== "string" || !id.trim() || typeof name !== "string") {
    return null;
  }
  return { id, name, note: typeof note === "string" ? note : "" };
}

function parseState(raw: unknown): NotepadState | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { clients, activeId } = raw as Record<string, unknown>;
  if (!Array.isArray(clients)) {
    return null;
  }
  const parsed = clients
    .map(parseClient)
    .filter((client): client is Client => client !== null);
  if (parsed.length === 0) {
    const next = createDefaultState();
    writeStored("t-helper-notepad", next);
    return next;
  }
  const identifiers = new Set<string>();
  for (const client of parsed) {
    if (identifiers.has(client.id)) client.id = crypto.randomUUID();
    identifiers.add(client.id);
  }
  const active =
    typeof activeId === "string" && parsed.some((client) => client.id === activeId)
      ? activeId
      : (parsed[0]?.id ?? "");
  return { clients: parsed, activeId: active };
}

export const notepadStore = createStore<NotepadState>({
  key: "t-helper-notepad",
  fallback: createDefaultState,
  parse: parseState,
});

function nextClientNumber(clients: readonly Client[]): number {
  const used = new Set(
    clients
      .map((client) => CLIENT_NAME_PATTERN.exec(client.name)?.[1])
      .filter((value): value is string => value !== undefined)
      .map(Number),
  );
  let next = 1;
  while (used.has(next)) {
    next += 1;
  }
  return next;
}

export function addClient(): string {
  const state = notepadStore.get();
  const client = createClient(`Клиент ${nextClientNumber(state.clients)}`);
  notepadStore.set({
    clients: [...state.clients, client],
    activeId: client.id,
  });
  return client.id;
}

export function setActiveClient(id: string): void {
  notepadStore.update((state) =>
    state.activeId === id || !state.clients.some((client) => client.id === id)
      ? state
      : { ...state, activeId: id },
  );
}

export function renameClient(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }
  notepadStore.update((state) => ({
    ...state,
    clients: state.clients.map((client) =>
      client.id === id ? { ...client, name: trimmed } : client,
    ),
  }));
}

export function removeClient(id: string): void {
  const state = notepadStore.get();
  const index = state.clients.findIndex((client) => client.id === id);
  if (index < 0 || state.clients.length <= 1) {
    return;
  }
  const clients = state.clients.filter((client) => client.id !== id);
  notepadStore.set({
    clients,
    activeId:
      state.activeId === id
        ? (clients[Math.max(0, index - 1)]?.id ?? "")
        : state.activeId,
  });
}

export function setClientNote(id: string, note: string): void {
  notepadStore.update((state) => ({
    ...state,
    clients: state.clients.map((client) =>
      client.id === id ? { ...client, note } : client,
    ),
  }));
}

export function clearNotepad(): void {
  notepadStore.set(createDefaultState());
}
