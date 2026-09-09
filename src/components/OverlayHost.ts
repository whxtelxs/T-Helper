import { createContext, type RefObject } from "preact";

export const OverlayHost = createContext<RefObject<HTMLElement | null> | null>(null);
