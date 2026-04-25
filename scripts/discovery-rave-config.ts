export type DiscoverySource = {
  key: string;
  label: string;
  url: string;
  mode: "discovery_only";
};

export type RaveKeywordGroup = {
  key: string;
  terms: string[];
};

export type TargetFestival = {
  key: string;
  name: string;
  country: string;
  city: string;
  vibeTags: string[];
  officialUrl: string;
};

export const DISCOVERY_SOURCES: DiscoverySource[] = [
  { key: "resident_advisor", label: "Resident Advisor", url: "https://ra.co/", mode: "discovery_only" },
  { key: "edmtrain", label: "EDMTrain", url: "https://edmtrain.com/", mode: "discovery_only" },
  { key: "electronic_festivals", label: "Electronic Festivals", url: "https://www.electronic-festivals.com/", mode: "discovery_only" },
];

export const RAVE_KEYWORD_GROUPS: RaveKeywordGroup[] = [
  { key: "psytrance", terms: ["psytrance festival", "psy trance gathering", "psychedelic trance outdoor"] },
  { key: "beach", terms: ["beach rave", "island party", "beach festival electronic"] },
  { key: "forest", terms: ["jungle party", "forest rave", "outdoor gathering"] },
  { key: "boutique", terms: ["boutique festival", "immersive electronic festival", "tribal gathering"] },
];

export const TARGET_FESTIVALS: TargetFestival[] = [
  {
    key: "ozora",
    name: "OZORA Festival",
    country: "Hungary",
    city: "Dabaspuszta",
    vibeTags: ["psytrance", "outdoor", "multinational"],
    officialUrl: "https://ozorafestival.eu/",
  },
  {
    key: "boom",
    name: "Boom Festival",
    country: "Portugal",
    city: "Idanha-a-Nova",
    vibeTags: ["psytrance", "outdoor", "multinational"],
    officialUrl: "https://boomfestival.org/",
  },
  {
    key: "universo_paralello",
    name: "Universo Paralello",
    country: "Brazil",
    city: "Pratigi",
    vibeTags: ["beach", "outdoor", "multinational"],
    officialUrl: "https://universoparalello.org/",
  },
  {
    key: "monegros",
    name: "Monegros Desert Festival",
    country: "Spain",
    city: "Fraga",
    vibeTags: ["desert", "outdoor", "rave"],
    officialUrl: "https://monegrosfestival.com/",
  },
  {
    key: "fullmoon",
    name: "Full Moon Party",
    country: "Thailand",
    city: "Koh Phangan",
    vibeTags: ["beach", "outdoor", "multinational"],
    officialUrl: "https://fullmoonparty-thailand.com/schedules/",
  },
];

export const RAVE_SOCIAL_TAGS = ["#psytranceworld", "#outdoorgathering", "#beachrave", "#islandparty", "#forestRave"];
