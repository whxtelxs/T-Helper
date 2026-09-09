import { packThelp, parseThelp } from "./thelp";
import type { PackageRequest, PackageResponse } from "./parseInWorker";

async function processRequest(request: PackageRequest): Promise<PackageResponse> {
  if (request.type === "parse")
    return { type: "parsed", result: await parseThelp(request.bytes) };
  return { type: "packed", bytes: await packThelp(request.data) };
}

self.onmessage = (event: MessageEvent<PackageRequest>) => {
  void processRequest(event.data).then(
    (response) =>
      self.postMessage(response, {
        transfer: response.type === "packed" ? [response.bytes.buffer] : [],
      }),
    (error: unknown) =>
      self.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Не удалось обработать пакет",
      } satisfies PackageResponse),
  );
};
