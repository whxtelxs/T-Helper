import { flushStoredWrites } from "./storage";

export type ExitResult = "complete" | "busy" | "save-failed";

let exiting = false;

export async function finishAppSession(
  action: () => Promise<unknown>,
): Promise<ExitResult> {
  if (exiting) return "busy";
  exiting = true;
  const previousInert = document.body.inert;
  document.body.inert = true;
  try {
    try {
      await flushStoredWrites();
    } catch {
      return "save-failed";
    }
    await action();
    return "complete";
  } finally {
    document.body.inert = previousInert;
    exiting = false;
  }
}
