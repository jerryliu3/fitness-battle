import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isLocalHost } from "@/lib/auth/design-access";

const PHENOTYPE_FILE = path.resolve(
  process.cwd(),
  "../../body-pipeline/local/phenotype.json",
);

export type VitalsPhenotypeSliders = {
  age: number;
  muscle: number;
  weight: number;
  height: number;
  proportions: number;
};

export type VitalsPhenotypeFile = {
  male: VitalsPhenotypeSliders;
  female: VitalsPhenotypeSliders;
};

export const DEFAULT_VITALS_PHENOTYPE: VitalsPhenotypeFile = {
  male: {
    age: 0.58,
    muscle: 0.32,
    weight: 0.48,
    height: 0.54,
    proportions: 0.5,
  },
  female: {
    age: 0.58,
    muscle: 0.28,
    weight: 0.44,
    height: 0.5,
    proportions: 0.52,
  },
};

function devAllowed(request: Request): boolean {
  const url = new URL(request.url);
  return (
    process.env.NODE_ENV === "development" && isLocalHost(url.hostname)
  );
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

function clamp01(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function normalizeSliders(
  input: Partial<VitalsPhenotypeSliders> | undefined,
  base: VitalsPhenotypeSliders,
): VitalsPhenotypeSliders {
  return {
    age: clamp01(input?.age, base.age),
    muscle: clamp01(input?.muscle, base.muscle),
    weight: clamp01(input?.weight, base.weight),
    height: clamp01(input?.height, base.height),
    proportions: clamp01(input?.proportions, base.proportions),
  };
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
    male: normalizeSliders(payload.male, current.male),
    female: normalizeSliders(payload.female, current.female),
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
