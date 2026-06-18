import { app, safeStorage } from "electron";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AuthSession } from "../../aws/types";

interface StoredSessionEnvelope {
  encrypted: boolean;
  payload: string;
}

export class AuthSessionStore {
  private readonly sessionPath = join(app.getPath("userData"), "auth-session.json");

  async load(): Promise<AuthSession | undefined> {
    try {
      const envelope = JSON.parse(await readFile(this.sessionPath, "utf8")) as StoredSessionEnvelope;
      const serialized = envelope.encrypted
        ? safeStorage.decryptString(Buffer.from(envelope.payload, "base64"))
        : Buffer.from(envelope.payload, "base64").toString("utf8");

      return JSON.parse(serialized) as AuthSession;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return undefined;
      }

      throw error;
    }
  }

  async save(session: AuthSession): Promise<void> {
    const serialized = JSON.stringify(session);
    const encrypted = safeStorage.isEncryptionAvailable();
    const payload = encrypted
      ? safeStorage.encryptString(serialized).toString("base64")
      : Buffer.from(serialized, "utf8").toString("base64");

    await mkdir(dirname(this.sessionPath), { recursive: true });
    await writeFile(this.sessionPath, `${JSON.stringify({ encrypted, payload }, null, 2)}\n`, "utf8");
  }

  async clear(): Promise<void> {
    await rm(this.sessionPath, { force: true });
  }
}
