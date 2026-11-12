import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isLocalHost } from "@/lib/auth/design-access";
import {
  DEFAULT_VITALS_PHENOTYPE,
  normalizePhenotypeSliders,
  type VitalsPhenotypeFile,
} from "@/lib/vitals-phenotype";

const PHENOTYPE_FILE = path.resolve(
  process.cwd(),
  "../../body-pipeline/local/phenotype.json",
);

function devAllowed(request: Request): boolean {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" && isLocalHost(url.hostname);
}

async function readPhenotype(): Promise<VitalsPhenotypeFile> {
  try {
    const raw = JSON.parse(await readFile(PHENOTYPE_FILE, "utf8")) as Partial<
      VitalsPhenotypeFile
    >;
    return {
      male: { ...DEFAULT_VITALS_PHENOTYPE.male, ...raw.male },
      female: { ...DEFAULT_VITALS_PHENOTYPE.female, ...raw.female },
    };
  } catch {
    return DEFAULT_VITALS_PHENOTYPE;
  }
}

export async function GET(request: Request) {
  if (!devAllowed(request)) return new Response(null, { status: 404 });
  const body = await readPhenotype();
  return Response.json(
    {
      ...body,
      path: "body-pipeline/local/phenotype.json",
      regen: "pnpm bodies:generate && pnpm bodies:sync",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!devAllowed(request)) return new Response(null, { status: 404 });
  let payload: Partial<VitalsPhenotypeFile>;
  try {
    payload = (await request.json()) as Partial<VitalsPhenotypeFile>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await readPhenotype();
  const next: VitalsPhenotypeFile = {
    male: normalizePhenotypeSliders(payload.male, current.male),
    female: normalizePhenotypeSliders(payload.female, current.female),
  };

  await mkdir(path.dirname(PHENOTYPE_FILE), { recursive: true });
  await writeFile(
    PHENOTYPE_FILE,
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );

  return Response.json({
    ok: true,
    ...next,
    regen: "pnpm bodies:generate && pnpm bodies:sync",
  });
}
