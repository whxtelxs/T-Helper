import { gt, valid } from "semver";

export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, "");
}

export function isValidVersion(raw: string): boolean {
  return valid(normalizeVersion(raw)) !== null;
}

export function isNewerVersion(remote: string, local: string): boolean {
  const remoteVersion = valid(normalizeVersion(remote));
  const localVersion = valid(normalizeVersion(local));
  return (
    remoteVersion !== null && localVersion !== null && gt(remoteVersion, localVersion)
  );
}
