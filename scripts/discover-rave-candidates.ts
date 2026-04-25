import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  DISCOVERY_SOURCES,
  RAVE_KEYWORD_GROUPS,
  RAVE_SOCIAL_TAGS,
  TARGET_FESTIVALS,
} from "./discovery-rave-config";

type DiscoveryCandidate = {
  kind: "festival" | "keyword_query" | "social_tag";
  key: string;
  label: string;
  source: string;
  discoveryOnly: true;
  officialUrl: string | null;
  tags: string[];
};

function buildCandidates(): DiscoveryCandidate[] {
  const out: DiscoveryCandidate[] = [];

  for (const festival of TARGET_FESTIVALS) {
    out.push({
      kind: "festival",
      key: festival.key,
      label: `${festival.name} (${festival.city}, ${festival.country})`,
      source: "official_festival_seed",
      discoveryOnly: true,
      officialUrl: festival.officialUrl,
      tags: festival.vibeTags,
    });
  }

  for (const source of DISCOVERY_SOURCES) {
    for (const group of RAVE_KEYWORD_GROUPS) {
      for (const term of group.terms) {
        out.push({
          kind: "keyword_query",
          key: `${source.key}:${group.key}:${term}`.toLowerCase().replace(/\s+/g, "_"),
          label: term,
          source: source.label,
          discoveryOnly: true,
          officialUrl: source.url,
          tags: [group.key, "query"],
        });
      }
    }
  }

  for (const tag of RAVE_SOCIAL_TAGS) {
    out.push({
      kind: "social_tag",
      key: `social:${tag.replace("#", "").toLowerCase()}`,
      label: tag,
      source: "social_media",
      discoveryOnly: true,
      officialUrl: null,
      tags: ["social", "discovery"],
    });
  }

  return out;
}

async function main() {
  const candidates = buildCandidates();
  const payload = {
    generatedAt: new Date().toISOString(),
    policy: "discovery_only_needs_official_verification_before_publish",
    candidates,
  };
  const outPath = path.join(process.cwd(), "scripts", "rave-discovery-cache.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[rave-discovery] wrote ${candidates.length} candidates to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
