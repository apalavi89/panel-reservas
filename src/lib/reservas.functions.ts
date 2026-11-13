import { createServerFn } from "@tanstack/react-start";
import { demoReservas, parseRows, type Reserva } from "./reservas";

const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

let cache: { token: string; exp: number } | null = null;

/** Obtiene un token de acceso de Google con la cuenta de servicio. */
async function getAccessToken(email: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cache && cache.exp > now + 60) return cache.token;
  const pem = privateKeyPem.replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`Token Google [${res.status}]: ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cache = { token: j.access_token, exp: now + j.expires_in };
  return j.access_token;
}

export const getReservas = createServerFn({ method: "GET" })
  .inputValidator((input: { fecha: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) throw new Error("Fecha inválida");
    return input;
  })
  .handler(async ({ data }): Promise<{ reservas: Reserva[]; fuente: "sheets" | "demo"; error?: string }> => {
    const email = process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"];
    const pk = process.env["GOOGLE_PRIVATE_KEY"];
    const sheetId = process.env["RESERVAS_SPREADSHEET_ID"];
    const range = process.env["RESERVAS_RANGE"] || "Reservas!A:H";
    if (!email || !pk || !sheetId) return { reservas: demoReservas(data.fecha), fuente: "demo" };
    try {
      const token = await getAccessToken(email, pk);
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Sheets error [${res.status}]: ${body}`);
        return { reservas: [], fuente: "sheets", error: `Google Sheets [${res.status}]` };
      }
      const json = (await res.json()) as { values?: string[][] };
      return { reservas: parseRows(json.values ?? []).filter((r) => r.fecha === data.fecha), fuente: "sheets" };
    } catch (e) {
      console.error(e);
      return { reservas: [], fuente: "sheets", error: (e as Error).message };
    }
  });
