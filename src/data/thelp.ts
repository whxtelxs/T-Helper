import type { ImportPayload } from "./transfer";
import {
  MAX_IMPORT_BYTES,
  validateEnvelope,
  validateImportPayload,
  type ImportResult,
} from "./validation";

export const THELP_EXTENSION = ".thelp";
export const THELP_MIME = "application/x-thelper-package";

const MAGIC = "THELP";
const CONTAINER_VERSION = 1;
const PAYLOAD_VERSION = 1;
const ENVELOPE_KIND = "t-helper-backup";
const KEY_MATERIAL = "t-helper-package-v1";

const MAGIC_SIZE = 5;
const HEADER_SIZE = 23;
const LENGTH_OFFSET = 7;
const NONCE_OFFSET = 11;
const NONCE_SIZE = 12;
const AUTH_TAG_SIZE = 16;

export type Bytes = Uint8Array<ArrayBuffer>;

type ThelpHeader = {
  version: number;
  payloadLength: number;
  nonce: Bytes;
};

function decodeMagic(bytes: Bytes): string {
  return new TextDecoder().decode(bytes.subarray(0, MAGIC_SIZE));
}

function readHeader(bytes: Bytes): ThelpHeader | null {
  if (bytes.length < HEADER_SIZE || decodeMagic(bytes) !== MAGIC) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    version: view.getUint8(MAGIC_SIZE),
    payloadLength: view.getUint32(LENGTH_OFFSET),
    nonce: bytes.subarray(NONCE_OFFSET, NONCE_OFFSET + NONCE_SIZE),
  };
}

function buildHeader(payloadLength: number, nonce: Bytes): Bytes {
  const header = new Uint8Array(HEADER_SIZE);
  header.set(new TextEncoder().encode(MAGIC), 0);
  header[MAGIC_SIZE] = CONTAINER_VERSION;
  new DataView(header.buffer).setUint32(LENGTH_OFFSET, payloadLength);
  header.set(nonce, NONCE_OFFSET);
  return header;
}

async function deriveKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(KEY_MATERIAL),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function packThelp(data: ImportPayload): Promise<Bytes> {
  const exportedAt = new Date().toISOString();
  const validated = validateImportPayload({ version: PAYLOAD_VERSION, ...data });
  if (!validated.ok) {
    throw new Error(`Не удалось собрать пакет: ${validated.error}`);
  }

  const plaintext = new TextEncoder().encode(
    JSON.stringify({
      kind: ENVELOPE_KIND,
      version: PAYLOAD_VERSION,
      exportedAt,
      data: { version: PAYLOAD_VERSION, ...validated.payload },
    }),
  );
  if (HEADER_SIZE + plaintext.length + AUTH_TAG_SIZE > MAX_IMPORT_BYTES) {
    throw new Error("Пакет превышает 8 МБ. Экспортируйте разделы по отдельности.");
  }
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      await deriveKey(),
      plaintext,
    ),
  );

  const file = new Uint8Array(HEADER_SIZE + ciphertext.length);
  file.set(buildHeader(ciphertext.length, nonce), 0);
  file.set(ciphertext, HEADER_SIZE);
  return file;
}

async function unpackThelp(bytes: Bytes): Promise<ImportResult> {
  const header = readHeader(bytes);
  if (!header) {
    return { ok: false, error: "invalid_format" };
  }
  if (HEADER_SIZE + header.payloadLength !== bytes.length) {
    return { ok: false, error: "corrupted" };
  }

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: header.nonce },
      await deriveKey(),
      bytes.subarray(HEADER_SIZE),
    );
    const envelope: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    return validateEnvelope(envelope, ENVELOPE_KIND);
  } catch {
    return { ok: false, error: "corrupted" };
  }
}

export function parseThelp(bytes: Bytes): Promise<ImportResult> {
  if (bytes.length > MAX_IMPORT_BYTES) {
    return Promise.resolve<ImportResult>({ ok: false, error: "too_large" });
  }
  if (decodeMagic(bytes) !== MAGIC) {
    return Promise.resolve<ImportResult>({ ok: false, error: "invalid_format" });
  }
  return unpackThelp(bytes);
}

export function downloadThelp(filename: string, bytes: Bytes): void {
  const blob = new Blob([bytes], { type: THELP_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(THELP_EXTENSION)
    ? filename
    : `${filename}${THELP_EXTENSION}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
