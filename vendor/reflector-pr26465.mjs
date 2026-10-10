// Bundled from mastra-ai/mastra@3781dc946a8545cd3548887496d54beb0f64c67d packages/memory (Apache-2.0, Copyright (c) 2025 Kepler Software, Inc.). Unmodified source, compiled by esbuild. See LICENSE-MASTRA.

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/anchor-ids.ts
function stripEphemeralAnchorIds(observations) {
  if (!observations) {
    return observations;
  }
  return observations.replace(/(^|\n)([^\S\n]*)\[(O\d+(?:-N\d+)?)\][^\S\n]*/g, "$1$2");
}

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/extractor.ts
import { z } from "zod";
var BUILT_IN_SLUGS = /* @__PURE__ */ new Set(["current-task", "suggested-response", "thread-title"]);
var EXTRACTED_VALUES_TAG = "extracted-values";
var RESERVED_XML_TAGS = /* @__PURE__ */ new Set([
  "observations",
  "observation",
  EXTRACTED_VALUES_TAG,
  "thread",
  "message",
  "messages",
  "conversation",
  "history",
  "system",
  "user",
  "assistant",
  "tool",
  ...BUILT_IN_SLUGS
]);
var BUILT_IN_EXTRACTOR_SLUGS = [...BUILT_IN_SLUGS];
function slugifyExtractorName(name) {
  let normalized = "";
  let previousWasSeparator = false;
  for (const char of name.trim().toLowerCase()) {
    const code = char.charCodeAt(0);
    const isLetter = code >= 97 && code <= 122;
    const isNumber = code >= 48 && code <= 57;
    if (isLetter || isNumber) {
      normalized += char;
      previousWasSeparator = false;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      continue;
    }
    if (!previousWasSeparator && normalized.length > 0) {
      normalized += "-";
      previousWasSeparator = true;
    }
  }
  return normalized.endsWith("-") ? normalized.slice(0, -1) : normalized;
}
function assertValidSlug(slug, name) {
  if (!slug) {
    throw new Error(`Extractor name "${name}" must produce a non-empty slug.`);
  }
  const first = slug.charCodeAt(0);
  const last = slug.charCodeAt(slug.length - 1);
  const startsWithLetter = first >= 97 && first <= 122;
  const endsWithLetterOrNumber = last >= 97 && last <= 122 || last >= 48 && last <= 57;
  const hasOnlySlugCharacters = [...slug].every((char) => {
    const code = char.charCodeAt(0);
    return code >= 97 && code <= 122 || code >= 48 && code <= 57 || char === "-";
  });
  if (!startsWithLetter || !endsWithLetterOrNumber || !hasOnlySlugCharacters) {
    throw new Error(`Extractor name "${name}" produced invalid slug "${slug}".`);
  }
}
var Extractor = class _Extractor {
  name;
  slug;
  instructions;
  schema;
  mode;
  includePreviousExtraction;
  metadataKeyPath;
  onExtracted;
  retryStructuredExtractionOnEmptyObject;
  /** @internal */
  internal;
  instructionsConfig;
  schemaConfig;
  constructor(config, internal = false) {
    const name = config.name.trim();
    const instructions = typeof config.instructions === "string" ? config.instructions.trim() : void 0;
    const slug = slugifyExtractorName(name);
    const isHook = config.mode === "hook";
    if (!name) {
      throw new Error("Extractor name is required.");
    }
    if (!isHook && !config.instructions) {
      throw new Error(`Extractor "${name}" must include instructions.`);
    }
    if (instructions !== void 0 && !instructions) {
      throw new Error(`Extractor "${name}" must include instructions.`);
    }
    if (isHook && !config.onExtracted) {
      throw new Error(`Hook extractor "${name}" must include an onExtracted handler.`);
    }
    if (isHook && (config.instructions || config.schema)) {
      throw new Error(`Hook extractor "${name}" cannot include instructions or a schema.`);
    }
    assertValidSlug(slug, name);
    if (!internal && RESERVED_XML_TAGS.has(slug)) {
      throw new Error(`Extractor slug "${slug}" is reserved by Observational Memory.`);
    }
    this.name = name;
    this.slug = slug;
    this.instructionsConfig = config.instructions ?? "";
    this.schemaConfig = config.schema;
    this.instructions = instructions ?? "";
    this.schema = isHook ? z.unknown() : typeof config.schema === "function" ? z.string() : config.schema ?? z.string();
    this.mode = isHook ? "hook" : internal || !config.schema ? "inline" : "structured";
    this.includePreviousExtraction = isHook ? false : config.includePreviousExtraction ?? true;
    this.metadataKeyPath = isHook ? false : config.metadataKeyPath ?? `extracted.${slug}`;
    this.onExtracted = config.onExtracted;
    this.retryStructuredExtractionOnEmptyObject = config.retryStructuredExtractionOnEmptyObject ?? false;
    this.internal = internal;
  }
  async resolve(context) {
    if (this.mode === "hook") {
      return this;
    }
    const instructions = typeof this.instructionsConfig === "function" ? (await this.instructionsConfig(context)).trim() : this.instructionsConfig.trim();
    if (!instructions) {
      throw new Error(`Extractor "${this.name}" must include instructions.`);
    }
    const schema = typeof this.schemaConfig === "function" ? await this.schemaConfig(context) : this.schemaConfig;
    return new _Extractor(
      {
        name: this.name,
        instructions,
        ...schema ? { schema } : {},
        includePreviousExtraction: this.includePreviousExtraction,
        metadataKeyPath: this.metadataKeyPath,
        onExtracted: this.onExtracted,
        retryStructuredExtractionOnEmptyObject: this.retryStructuredExtractionOnEmptyObject
      },
      this.internal
    );
  }
};
function validateExtractorList(extractors) {
  const seen = /* @__PURE__ */ new Map();
  for (const extractor of extractors) {
    assertValidSlug(extractor.slug, extractor.name);
    if (!extractor.internal && RESERVED_XML_TAGS.has(extractor.slug)) {
      throw new Error(`Extractor slug "${extractor.slug}" is reserved by Observational Memory.`);
    }
    const previous = seen.get(extractor.slug);
    if (previous) {
      throw new Error(`Duplicate extractor slug "${extractor.slug}" from "${previous}" and "${extractor.name}".`);
    }
    seen.set(extractor.slug, extractor.name);
  }
  return [...extractors];
}
function isJsonLike(value) {
  return /^(?:[\[{"-]|\d|true\b|false\b|null\b)/.test(value.trim());
}
function candidateValues(raw) {
  const trimmed = raw.trim();
  const candidates = [];
  const add = (value) => {
    if (!candidates.some((candidate) => Object.is(candidate, value))) {
      candidates.push(value);
    }
  };
  if (isJsonLike(trimmed)) {
    try {
      add(JSON.parse(trimmed));
    } catch {
    }
  }
  add(trimmed);
  if (!isJsonLike(trimmed)) {
    try {
      add(JSON.parse(trimmed));
    } catch {
    }
  }
  return candidates;
}
function parseExtractorValue(extractor, raw) {
  const failures = [];
  for (const candidate of candidateValues(raw)) {
    const parsed = extractor.schema.safeParse(candidate);
    if (parsed.success) {
      return parsed.data;
    }
    failures.push(parsed.error.message);
  }
  throw new Error(`Extractor "${extractor.slug}" output did not match its schema: ${failures[0] ?? "invalid value"}`);
}
function parseExtractedValuesObject(raw) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("Write only the extracted values JSON object here.")) {
    return void 0;
  }
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${EXTRACTED_VALUES_TAG} must contain a JSON object.`);
  }
  return parsed;
}
function parseExtractedValues(output, extractors) {
  const values = {};
  const failures = [];
  const inlineExtractors = extractors.filter((extractor) => extractor.mode === "inline");
  const regex = new RegExp(`<${EXTRACTED_VALUES_TAG}>([\\s\\S]*?)<\\/${EXTRACTED_VALUES_TAG}>`, "gi");
  const matches = [...output.matchAll(regex)];
  for (const match of matches) {
    try {
      const extractedValues = parseExtractedValuesObject(match[1] ?? "");
      if (!extractedValues) {
        continue;
      }
      for (const extractor of inlineExtractors) {
        if (!Object.prototype.hasOwnProperty.call(extractedValues, extractor.slug)) {
          continue;
        }
        const rawValue = extractedValues[extractor.slug];
        if (rawValue === void 0 || rawValue === null || rawValue === "") {
          continue;
        }
        const parsed = extractor.schema.safeParse(rawValue);
        if (parsed.success) {
          values[extractor.slug] = parsed.data;
        } else {
          failures.push({ slug: extractor.slug, error: parsed.error.message });
        }
      }
    } catch (error) {
      failures.push({ slug: EXTRACTED_VALUES_TAG, error: error instanceof Error ? error.message : String(error) });
    }
  }
  for (const extractor of inlineExtractors) {
    if (Object.prototype.hasOwnProperty.call(values, extractor.slug)) {
      continue;
    }
    const tagRegex = new RegExp(`<${extractor.slug}>([\\s\\S]*?)<\\/${extractor.slug}>`, "gi");
    const tagMatch = [...output.matchAll(tagRegex)].at(-1);
    const rawValue = tagMatch?.[1]?.trim();
    if (!rawValue) {
      continue;
    }
    try {
      values[extractor.slug] = parseExtractorValue(extractor, rawValue);
    } catch (error) {
      failures.push({ slug: extractor.slug, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { values, failures };
}
function stripExtractorSections(output, extractors) {
  const inlineExtractors = extractors.filter((extractor) => extractor.mode === "inline");
  let stripped = output.replace(
    new RegExp(`[ \\t]*<${EXTRACTED_VALUES_TAG}>[\\s\\S]*?<\\/${EXTRACTED_VALUES_TAG}>\\s*`, "gi"),
    ""
  );
  for (const extractor of inlineExtractors) {
    stripped = stripped.replace(new RegExp(`[ \\t]*<${extractor.slug}>[\\s\\S]*?<\\/${extractor.slug}>\\s*`, "gi"), "");
  }
  return stripped;
}
function buildExtractorOutputSections(extractors) {
  const inlineExtractors = extractors.filter((extractor) => extractor.mode === "inline");
  if (inlineExtractors.length === 0) {
    return "";
  }
  const sections = inlineExtractors.map(
    (extractor) => `<${extractor.slug}>
${extractor.instructions}
Include this section when the observations contain relevant information for <${extractor.slug}>. Write only that information inside the tag.
</${extractor.slug}>`
  ).join("\n\n");
  return `Additional optional XML sections:
If the observations include information relevant to any of these tags, output that tag after <observations> and include the relevant information.
${sections}`;
}
function renderPriorValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}
function buildExtractorPriorLines(extractors, priorExtractedValues) {
  if (!priorExtractedValues) {
    return [];
  }
  const lines = [];
  for (const extractor of extractors) {
    if (!extractor.includePreviousExtraction) {
      continue;
    }
    const value = priorExtractedValues[extractor.slug];
    if (value === void 0 || value === null || value === "") {
      continue;
    }
    lines.push(`<${extractor.slug}>
${renderPriorValue(value)}
</${extractor.slug}>`);
  }
  return lines;
}

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/observation-groups.ts
var OBSERVATION_GROUP_OPEN = "<observation-group";
var OBSERVATION_GROUP_CLOSE = "</observation-group>";
var ATTRIBUTE_PATTERN = /([\w][\w-]*)="([^"]*)"/g;
var REFLECTION_GROUP_SPLIT_PATTERN = /^##\s+Group\s+/m;
function parseObservationGroupAttributes(attributeString) {
  const attributes = {};
  for (const match of attributeString.matchAll(ATTRIBUTE_PATTERN)) {
    const [, key, value] = match;
    if (key && value !== void 0) {
      attributes[key] = value;
    }
  }
  return attributes;
}
function isLineStart(observations, index) {
  return index === 0 || observations[index - 1] === "\n";
}
function scanObservationGroupTags(observations) {
  const tags = [];
  const incompleteOpenings = [];
  let cursor = 0;
  let closeFloor = 0;
  let nestedFloor = -1;
  while (cursor < observations.length) {
    const start = observations.indexOf(OBSERVATION_GROUP_OPEN, cursor);
    if (start === -1) break;
    const attributesStart = start + OBSERVATION_GROUP_OPEN.length;
    if (!/\s/.test(observations[attributesStart] ?? "")) {
      cursor = attributesStart;
      continue;
    }
    const openEnd = observations.indexOf(">", attributesStart);
    if (openEnd === -1) break;
    const closeStart = observations.indexOf(OBSERVATION_GROUP_CLOSE, Math.max(openEnd + 1, closeFloor));
    if (closeStart === -1) {
      if (isLineStart(observations, start)) {
        incompleteOpenings.push({ start, end: openEnd + 1 });
      }
      closeFloor = observations.length;
      cursor = openEnd + 1;
      continue;
    }
    if (nestedFloor <= openEnd) {
      const lineOpen = observations.indexOf(`
${OBSERVATION_GROUP_OPEN}`, openEnd);
      nestedFloor = lineOpen === -1 ? observations.length : lineOpen + 1;
    }
    const nestedStart = nestedFloor;
    if (nestedStart < closeStart) {
      incompleteOpenings.push({ start, end: openEnd + 1 });
      closeFloor = closeStart;
      cursor = nestedStart;
      continue;
    }
    tags.push({
      start,
      end: closeStart + OBSERVATION_GROUP_CLOSE.length,
      attributeString: observations.slice(attributesStart, openEnd),
      content: observations.slice(openEnd + 1, closeStart)
    });
    closeFloor = closeStart;
    cursor = closeStart + OBSERVATION_GROUP_CLOSE.length;
  }
  return { tags, incompleteOpenings };
}
function replaceObservationGroupTags(observations, replace) {
  const { tags, incompleteOpenings } = scanObservationGroupTags(observations);
  const parts = [];
  let cursor = 0;
  let openingIndex = 0;
  const skipIncompleteOpeningsBefore = (limit) => {
    while (openingIndex < incompleteOpenings.length && incompleteOpenings[openingIndex].start < limit) {
      const opening = incompleteOpenings[openingIndex];
      openingIndex++;
      if (opening.start < cursor) continue;
      parts.push(observations.slice(cursor, opening.start));
      cursor = opening.end;
    }
  };
  for (const tag of tags) {
    skipIncompleteOpeningsBefore(tag.start);
    parts.push(observations.slice(cursor, tag.start), replace(tag));
    cursor = tag.end;
  }
  skipIncompleteOpeningsBefore(Number.POSITIVE_INFINITY);
  parts.push(observations.slice(cursor));
  return parts.join("");
}
function parseReflectionObservationGroupSections(content) {
  const normalizedContent = content.trim();
  if (!normalizedContent || !REFLECTION_GROUP_SPLIT_PATTERN.test(normalizedContent)) {
    return [];
  }
  return normalizedContent.split(REFLECTION_GROUP_SPLIT_PATTERN).map((section) => section.trim()).filter(Boolean).map((section) => {
    const newlineIndex = section.indexOf("\n");
    const heading = (newlineIndex >= 0 ? section.slice(0, newlineIndex) : section).trim();
    const body = (newlineIndex >= 0 ? section.slice(newlineIndex + 1) : "").trim();
    return {
      heading,
      body: stripReflectionGroupMetadata(body)
    };
  });
}
function stripReflectionGroupMetadata(body) {
  return body.replace(/^_range:\s*`[^`]*`_\s*\n?/m, "").trim();
}
function generateAnchorId() {
  return Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(8))).toString("hex");
}
function wrapInObservationGroup(observations, range, id = generateAnchorId(), _sourceGroupIds, kind) {
  const content = observations.trim();
  const kindAttr = kind ? ` kind="${kind}"` : "";
  return `<observation-group id="${id}" range="${range}"${kindAttr}>
${content}
</observation-group>`;
}
function parseObservationGroups(observations) {
  if (!observations) {
    return [];
  }
  const groups = [];
  for (const tag of scanObservationGroupTags(observations).tags) {
    const attributes = parseObservationGroupAttributes(tag.attributeString);
    const id = attributes.id;
    const range = attributes.range;
    if (!id || !range) {
      continue;
    }
    groups.push({
      id,
      range,
      kind: attributes.kind,
      content: tag.content.trim()
    });
  }
  return groups;
}
function stripObservationGroups(observations) {
  if (!observations) {
    return observations;
  }
  return replaceObservationGroupTags(observations, (tag) => tag.content.trim()).replace(/\n{3,}/g, "\n\n").trim();
}
function getRangeSegments(range) {
  return range.split(",").map((segment) => segment.trim()).filter(Boolean);
}
function getRangeEndpoints(segment) {
  const parts = segment.split(":").map((part) => part.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { start: parts[0], end: parts[1] };
}
function spanRangeSegments(segments) {
  const endpoints = segments.map(getRangeEndpoints);
  if (endpoints.some((endpoint) => endpoint === null)) {
    return segments.join(",");
  }
  const first = endpoints[0];
  const last = endpoints.at(-1);
  return `${first.start}:${last.end}`;
}
function combineObservationGroupRanges(groups) {
  const segments = Array.from(new Set(groups.flatMap((group) => getRangeSegments(group.range))));
  if (segments.length === 0) {
    return "";
  }
  const numericEndpoints = [];
  const allNumeric = segments.every((segment) => {
    const endpoints = getRangeEndpoints(segment);
    if (!endpoints || !/^\d+$/.test(endpoints.start) || !/^\d+$/.test(endpoints.end)) {
      return false;
    }
    const start = { label: endpoints.start, value: Number(endpoints.start) };
    const end = { label: endpoints.end, value: Number(endpoints.end) };
    if (!Number.isSafeInteger(start.value) || !Number.isSafeInteger(end.value)) {
      return false;
    }
    numericEndpoints.push(start.value <= end.value ? { start, end } : { start: end, end: start });
    return true;
  });
  if (!allNumeric) {
    return spanRangeSegments(segments);
  }
  const first = numericEndpoints.reduce((lowest, pair) => pair.start.value < lowest.start.value ? pair : lowest);
  const last = numericEndpoints.reduce((highest, pair) => pair.end.value > highest.end.value ? pair : highest);
  return `${first.start.label}:${last.end.label}`;
}
function getCanonicalGroupId(sectionHeading, fallbackIndex) {
  const match = sectionHeading.match(/`([^`]+)`/);
  return match?.[1]?.trim() || `derived-group-${fallbackIndex + 1}`;
}
function getContentLines(content) {
  return content.split("\n").map((line) => line.trim()).filter(Boolean);
}
function deriveObservationGroupProvenance(content, groups) {
  const sections = parseReflectionObservationGroupSections(content);
  if (sections.length === 0 || groups.length === 0) {
    return [];
  }
  return sections.map((section, index) => {
    const canonicalGroupId = getCanonicalGroupId(section.heading, index);
    const identifiedGroup = groups.find((group) => group.id === canonicalGroupId);
    const bodyLines = new Set(getContentLines(section.body));
    const matchingGroups = groups.filter((group) => getContentLines(group.content).some((line) => bodyLines.has(line)));
    const fallbackGroup = groups[Math.min(index, groups.length - 1)];
    const identifiedLines = new Set(getContentLines(identifiedGroup?.content ?? ""));
    const contributingGroups = identifiedGroup ? matchingGroups.filter(
      (group) => group.id !== identifiedGroup.id && getContentLines(group.content).some((line) => bodyLines.has(line) && !identifiedLines.has(line))
    ) : [];
    const resolvedGroups = identifiedGroup ? groups.filter((group) => group === identifiedGroup || contributingGroups.includes(group)) : matchingGroups.length > 0 ? matchingGroups : fallbackGroup ? [fallbackGroup] : [];
    return {
      id: canonicalGroupId,
      range: combineObservationGroupRanges(resolvedGroups),
      kind: "reflection",
      content: section.body
    };
  });
}
function reconcileObservationGroupsFromReflection(content, sourceObservations) {
  const sourceGroups = parseObservationGroups(sourceObservations);
  if (sourceGroups.length === 0) {
    return null;
  }
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return "";
  }
  const derivedGroups = deriveObservationGroupProvenance(normalizedContent, sourceGroups);
  if (derivedGroups.length > 0) {
    return derivedGroups.map((group) => wrapInObservationGroup(group.content, group.range, group.id, void 0, group.kind)).join("\n\n");
  }
  return wrapInObservationGroup(
    normalizedContent,
    combineObservationGroupRanges(sourceGroups),
    generateAnchorId(),
    void 0,
    "reflection"
  );
}

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/date-utils.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
var MONTH = String.raw`(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?`;
var DAY = String.raw`\d{1,2}(?:st|nd|rd|th)?`;
var YEAR = String.raw`(?:19|20|21)\d{2}(?!\d)`;
var MERIDIEM = String.raw`(?:[AaPp]\.[Mm]\.|[AaPp][Mm]\b)`;
var TIME = String.raw`(?:,?\s+(?:at\s+)?\d{1,2}:\d{2}(?:\s*${MERIDIEM})?|\s+at\s+\d{1,2}\s*${MERIDIEM})`;
var QUALIFIER = String.raw`(?:(?:early|mid|late)[- ](?:to[- ](?:early|mid|late)[- ])?)`;
var RANGE_SEP = String.raw`(?:\s*[–—]\s*|\s*-\s*|\s+(?:to|through|until)\s+)`;
var FREE_TEXT_DATE = new RegExp(
  [
    String.raw`\b${MONTH}\s+${DAY}(?:,?\s+${YEAR})?${RANGE_SEP}${MONTH}\s+${DAY},?\s+${YEAR}${TIME}?`,
    String.raw`\b${MONTH}\s+${DAY}${RANGE_SEP}${DAY},?\s+${YEAR}`,
    String.raw`\b${MONTH}\s+${DAY},?\s+${YEAR}${TIME}?`,
    String.raw`\b${QUALIFIER}?${MONTH}(?:\s+${YEAR})?${RANGE_SEP}${QUALIFIER}?${MONTH}\s+${YEAR}`,
    String.raw`\b${QUALIFIER}?${MONTH}\s+${YEAR}`
  ].join("|"),
  "g"
);
var ENDPOINT = new RegExp(
  String.raw`^(?:(early|mid|late)\s*)?(?:(${MONTH})\s*)?(?:(\d{1,2})(?:st|nd|rd|th)?)?,?\s*(?:(${YEAR}))?$`,
  "i"
);
var QUALIFIED_YEAR = new RegExp(
  String.raw`\b(?:by|in|until|before|after|(?:the\s+)?(?:early|mid|late|end\s+of|start\s+of|beginning\s+of))\s+${YEAR}`,
  "gi"
);
var MIN_TEMPORAL_GAP_MS = 10 * 60 * 1e3;

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/string-utils.ts
function safeSlice(str, end) {
  if (end <= 0) return "";
  if (end >= str.length) return str;
  const code = str.charCodeAt(end - 1);
  const safeEnd = code >= 55296 && code <= 56319 ? end - 1 : end;
  return str.slice(0, safeEnd);
}

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/tool-argument-helpers.ts
import { estimateTokenCount } from "tokenx";

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/tool-result-helpers.ts
import { estimateTokenCount as estimateTokenCount2 } from "tokenx";

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/observer-agent.ts
var OBSERVER_EXTRACTION_INSTRUCTIONS = `CRITICAL: DISTINGUISH USER ASSERTIONS FROM QUESTIONS

When the user TELLS you something about themselves, mark it as an assertion:
- "I have two kids" \u2192 \u{1F534} (14:30) User stated has two kids
- "I work at Acme Corp" \u2192 \u{1F534} (14:31) User stated works at Acme Corp
- "I graduated in 2019" \u2192 \u{1F534} (14:32) User stated graduated in 2019

When the user ASKS about something, mark it as a question/request:
- "Can you help me with X?" \u2192 \u{1F534} (15:00) User asked help with X
- "What's the best way to do Y?" \u2192 \u{1F534} (15:01) User asked best way to do Y

Distinguish between QUESTIONS and STATEMENTS OF INTENT:
- "Can you recommend..." \u2192 Question (extract as "User asked...")
- "I'm looking forward to [doing X]" \u2192 Statement of intent (extract as "User stated they will [do X] (include estimated/actual date if mentioned)")
- "I need to [do X]" \u2192 Statement of intent (extract as "User stated they need to [do X] (again, add date if mentioned)")

STATE CHANGES AND UPDATES:
When a user indicates they are changing something, frame it as a state change that supersedes previous information:
- "I'm going to start doing X instead of Y" \u2192 "User will start doing X (changing from Y)"
- "I'm switching from A to B" \u2192 "User is switching from A to B"
- "I moved my stuff to the new place" \u2192 "User moved their stuff to the new place (no longer at previous location)"

If the new state contradicts or updates previous information, make that explicit:
- BAD: "User plans to use the new method"
- GOOD: "User will use the new method (replacing the old approach)"

This helps distinguish current state from outdated information.

USER ASSERTIONS ARE AUTHORITATIVE. The user is the source of truth about their own life.
If a user previously stated something and later asks a question about the same topic,
the assertion is the answer - the question doesn't invalidate what they already told you.

TEMPORAL ANCHORING:
Each observation has TWO potential timestamps:

1. BEGINNING: The time the statement was made (from the message timestamp) - ALWAYS include this
2. END: The time being REFERENCED, if different from when it was said - ONLY when there's a relative time reference

ONLY add "(meaning DATE)" or "(estimated DATE)" at the END when you can provide an ACTUAL DATE:
- Past: "last week", "yesterday", "a few days ago", "last month", "in March"
- Future: "this weekend", "tomorrow", "next week"

DO NOT add end dates for:
- Present-moment statements with no time reference
- Vague references like "recently", "a while ago", "lately", "soon" - these cannot be converted to actual dates

FORMAT:
- With time reference: (TIME) [observation]. (meaning/estimated DATE)
- Without time reference: (TIME) [observation].

GOOD: (09:15) User's friend had a birthday party in March. (meaning March 20XX)
      ^ References a past event - add the referenced date at the end

GOOD: (09:15) User will visit their parents this weekend. (meaning June 17-18, 20XX)
      ^ References a future event - add the referenced date at the end

GOOD: (09:15) User prefers hiking in the mountains.
      ^ Present-moment preference, no time reference - NO end date needed

GOOD: (09:15) User is considering adopting a dog.
      ^ Present-moment thought, no time reference - NO end date needed

BAD: (09:15) User prefers hiking in the mountains. (meaning June 15, 20XX - today)
     ^ No time reference in the statement - don't repeat the message timestamp at the end

IMPORTANT: If an observation contains MULTIPLE events, split them into SEPARATE observation lines.
EACH split observation MUST have its own date at the end - even if they share the same time context.

Examples (assume message is from June 15, 20XX):

BAD: User will visit their parents this weekend (meaning June 17-18, 20XX) and go to the dentist tomorrow.
GOOD (split into two observations, each with its date):
  User will visit their parents this weekend. (meaning June 17-18, 20XX)
  User will go to the dentist tomorrow. (meaning June 16, 20XX)

BAD: User needs to clean the garage this weekend and is looking forward to setting up a new workbench.
GOOD (split, BOTH get the same date since they're related):
  User needs to clean the garage this weekend. (meaning June 17-18, 20XX)
  User will set up a new workbench this weekend. (meaning June 17-18, 20XX)

BAD: User was given a gift by their friend (estimated late May 20XX) last month.
GOOD: (09:15) User was given a gift by their friend last month. (estimated late May 20XX)
      ^ Message time at START, relative date reference at END - never in the middle

BAD: User started a new job recently and will move to a new apartment next week.
GOOD (split):
  User started a new job recently.
  User will move to a new apartment next week. (meaning June 21-27, 20XX)
  ^ "recently" is too vague for a date - omit the end date. "next week" can be calculated.

ALWAYS put the date at the END in parentheses - this is critical for temporal reasoning.
When splitting related events that share the same time context, EACH observation must have the date.

PRESERVE UNUSUAL PHRASING:
When the user uses unexpected or non-standard terminology, quote their exact words.

BAD: User exercised.
GOOD: User stated they did a "movement session" (their term for exercise).

USE PRECISE ACTION VERBS:
Replace vague verbs like "getting", "got", "have" with specific action verbs that clarify the nature of the action.
If the assistant confirms or clarifies the user's action, use the assistant's more precise language.

BAD: User is getting X.
GOOD: User subscribed to X. (if context confirms recurring delivery)
GOOD: User purchased X. (if context confirms one-time acquisition)

BAD: User got something.
GOOD: User purchased / received / was given something. (be specific)

Common clarifications:
- "getting" something regularly \u2192 "subscribed to" or "enrolled in"
- "getting" something once \u2192 "purchased" or "acquired"
- "got" \u2192 "purchased", "received as gift", "was given", "picked up"
- "signed up" \u2192 "enrolled in", "registered for", "subscribed to"
- "stopped getting" \u2192 "canceled", "unsubscribed from", "discontinued"

When the assistant interprets or confirms the user's vague language, prefer the assistant's precise terminology.

PRESERVING DETAILS IN ASSISTANT-GENERATED CONTENT:

When the assistant provides lists, recommendations, or creative content that the user explicitly requested,
preserve the DISTINGUISHING DETAILS that make each item unique and queryable later.

1. RECOMMENDATION LISTS - Preserve the key attribute that distinguishes each item:
   BAD: Assistant recommended 5 hotels in the city.
   GOOD: Assistant recommended hotels: Hotel A (near the train station), Hotel B (budget-friendly), 
         Hotel C (has rooftop pool), Hotel D (pet-friendly), Hotel E (historic building).
   
   BAD: Assistant listed 3 online stores for craft supplies.
   GOOD: Assistant listed craft stores: Store A (based in Germany, ships worldwide), 
         Store B (specializes in vintage fabrics), Store C (offers bulk discounts).

2. NAMES, HANDLES, AND IDENTIFIERS - Always preserve specific identifiers:
   BAD: Assistant provided social media accounts for several photographers.
   GOOD: Assistant provided photographer accounts: @photographer_one (portraits), 
         @photographer_two (landscapes), @photographer_three (nature).
   
   BAD: Assistant listed some authors to check out.
   GOOD: Assistant recommended authors: Jane Smith (mystery novels), 
         Bob Johnson (science fiction), Maria Garcia (historical romance).

3. CREATIVE CONTENT - Preserve structure and key sequences:
   BAD: Assistant wrote a poem with multiple verses.
   GOOD: Assistant wrote a 3-verse poem. Verse 1 theme: loss. Verse 2 theme: hope. 
         Verse 3 theme: renewal. Refrain: "The light returns."
   
   BAD: User shared their lucky numbers from a fortune cookie.
   GOOD: User's fortune cookie lucky numbers: 7, 14, 23, 38, 42, 49.

4. TECHNICAL/NUMERICAL RESULTS - Preserve specific values:
   BAD: Assistant explained the performance improvements from the optimization.
   GOOD: Assistant explained the optimization achieved 43.7% faster load times 
         and reduced memory usage from 2.8GB to 940MB.
   
   BAD: Assistant provided statistics about the dataset.
   GOOD: Assistant provided dataset stats: 7,342 samples, 89.6% accuracy, 
         23ms average inference time.

5. QUANTITIES AND COUNTS - Always preserve how many of each item:
   BAD: Assistant listed items with details but no quantities.
   GOOD: Assistant listed items: Item A (4 units, size large), Item B (2 units, size small).
   
   When listing items with attributes, always include the COUNT first before other details.

6. ROLE/PARTICIPATION STATEMENTS - When user mentions their role at an event:
   BAD: User attended the company event.
   GOOD: User was a presenter at the company event.
   
   BAD: User went to the fundraiser.
   GOOD: User volunteered at the fundraiser (helped with registration).
   
   Always capture specific roles: presenter, organizer, volunteer, team lead, 
   coordinator, participant, contributor, helper, etc.

CONVERSATION CONTEXT:
- What the user is working on or asking about
- Previous topics and their outcomes
- What user understands or needs clarification on
- Specific requirements or constraints mentioned
- Contents of assistant learnings and summaries
- Answers to users questions including full context to remember detailed summaries and explanations
- Assistant explanations, especially complex ones. observe the fine details so that the assistant does not forget what they explained
- Relevant code snippets
- User preferences (like favourites, dislikes, preferences, etc)
- Any specifically formatted text or ascii that would need to be reproduced or referenced in later interactions (preserve these verbatim in memory)
- Sequences, units, measurements, and any kind of specific relevant data
- Any blocks of any text which the user and assistant are iteratively collaborating back and forth on should be preserved verbatim
- When who/what/where/when is mentioned, note that in the observation. Example: if the user received went on a trip with someone, observe who that someone was, where the trip was, when it happened, and what happened, not just that the user went on the trip.
- For any described entity (like a person, place, thing, etc), preserve the attributes that would help identify or describe the specific entity later: location ("near X"), specialty ("focuses on Y"), unique feature ("has Z"), relationship ("owned by W"), or other details. The entity's name is important, but so are any additional details that distinguish it. If there are a list of entities, preserve these details for each of them.

USER MESSAGE CAPTURE:
- Short and medium-length user messages should be captured nearly verbatim in your own words.
- For very long user messages, summarize but quote key phrases that carry specific intent or meaning.
- This is critical for continuity: when the conversation window shrinks, the observations are the only record of what the user said.

AVOIDING REPETITIVE OBSERVATIONS:
- Do NOT repeat the same observation across multiple turns if there is no new information.
- When the agent performs repeated similar actions (e.g., browsing files, running the same tool type multiple times), group them into a single parent observation with sub-bullets for each new result.

Example \u2014 BAD (repetitive):
* \u{1F7E1} (14:30) Agent used view tool on src/auth.ts
* \u{1F7E1} (14:31) Agent used view tool on src/users.ts
* \u{1F7E1} (14:32) Agent used view tool on src/routes.ts

Example \u2014 GOOD (grouped):
* \u{1F7E1} (14:30) Agent browsed source files for auth flow
  * -> viewed src/auth.ts \u2014 found token validation logic
  * -> viewed src/users.ts \u2014 found user lookup by email
  * -> viewed src/routes.ts \u2014 found middleware chain

Only add a new observation for a repeated action if the NEW result changes the picture.

ACTIONABLE INSIGHTS:
- What worked well in explanations
- What needs follow-up or clarification
- User's stated goals or next steps (note if the user tells you not to do a next step, or asks for something specific, other next steps besides the users request should be marked as "waiting for user", unless the user explicitly says to continue all next steps)

COMPLETION TRACKING:
Completion observations are not just summaries. They are explicit memory signals to the assistant that a task, question, or subtask has been resolved.
Without clear completion markers, the assistant may forget that work is already finished and may repeat, reopen, or continue an already-completed task.

Use \u2705 to answer: "What exactly is now done?"
Choose completion observations that help the assistant know what is finished and should not be reworked unless new information appears.

Use \u2705 when:
- The user explicitly confirms something worked or was answered ("thanks, that fixed it", "got it", "perfect")
- The assistant provided a definitive, complete answer to a factual question and the user moved on
- A multi-step task reached its stated goal
- The user acknowledged receipt of requested information
- A concrete subtask, fix, deliverable, or implementation step became complete during ongoing work

Do NOT use \u2705 when:
- The assistant merely responded \u2014 the user might follow up with corrections
- The topic is paused but not resolved ("I'll try that later")
- The user's reaction is ambiguous

FORMAT:
As a sub-bullet under the related observation group:
* \u{1F534} (14:30) User asked how to configure auth middleware
  * -> Agent explained JWT setup with code example
  * \u2705 User confirmed auth is working

Or as a standalone observation when closing out a broader task:
* \u2705 (14:45) Auth configuration task completed \u2014 user confirmed middleware is working

Completion observations should be terse but specific about WHAT was completed.
Prefer concrete resolved outcomes over abstract workflow status so the assistant remembers what is already done.`;
var OBSERVER_OUTPUT_FORMAT_BASE = buildObserverOutputFormat();
function buildObserverOutputFormat(extractors) {
  const extractorSections = buildExtractorOutputSections(extractors ?? []);
  const legacyContinuationSections = extractors === void 0 ? `
<current-task>
State the current task(s) explicitly:
- Primary: What the agent is currently working on
- Secondary: Other pending tasks (mark as "waiting for user" if appropriate)
</current-task>

<suggested-response>
Hint for the agent's immediate next message. Examples:
- "I've updated the navigation model. Let me walk you through the changes..."
- "The assistant should wait for the user to respond before continuing."
- Call the view tool on src/example.ts to continue debugging.
</suggested-response>` : "";
  return `Use priority levels:
- \u{1F534} High: explicit user facts, preferences, unresolved goals, critical context
- \u{1F7E1} Medium: project details, learned information, tool results
- \u{1F7E2} Low: minor details, uncertain observations
- \u2705 Completed: concrete task finished, question answered, issue resolved, goal achieved, or subtask completed in a way that helps the assistant know it is done

Group related observations (like tool sequences) by indenting:
* \u{1F534} (14:33) Agent debugging auth issue
  * -> ran git status, found 3 modified files
  * -> viewed auth.ts:45-60, found missing null check
  * -> applied fix, tests now pass
  * \u2705 Tests passing, auth issue resolved

Group observations by date. Within a date, list observations in the order the events happened (not by importance), each with 24-hour time.

<observations>
Date: Dec 4, 2025
* \u{1F534} (14:30) User prefers direct answers
* \u{1F534} (14:31) Working on feature X
* \u{1F7E1} (14:32) User might prefer dark mode

Date: Dec 5, 2025
* \u{1F534} (09:15) Continued work on feature X
</observations>

${extractorSections || legacyContinuationSections}`;
}
var OBSERVER_GUIDELINES = `- Be specific enough for the assistant to act on
- Good: "User prefers short, direct answers without lengthy explanations"
- Bad: "User stated a preference" (too vague)
- Add 1 to 5 observations per exchange
- Use terse language to save tokens. Sentences should be dense without unnecessary words
- Do not add repetitive observations that have already been observed. Group repeated similar actions (tool calls, file browsing) under a single parent with sub-bullets for new results
- If the agent calls tools, observe what was called, why, and what was learned
- When observing files with line numbers, include the line number if useful
- If the agent provides a detailed response, observe the contents so it could be repeated
- Make sure you start each observation with a priority emoji (\u{1F534}, \u{1F7E1}, \u{1F7E2}) or a completion marker (\u2705)
- Capture the user's words closely \u2014 short/medium messages near-verbatim, long messages summarized with key quotes. User confirmations or explicit resolved outcomes should be \u2705 when they clearly signal something is done; unresolved or critical user facts remain \u{1F534}
- Treat \u2705 as a memory signal that tells the assistant something is finished and should not be repeated unless new information changes it
- Make completion observations answer "What exactly is now done?"
- Prefer concrete resolved outcomes over meta-level workflow or bookkeeping updates
- When multiple concrete things were completed, capture the concrete completed work rather than collapsing it into a vague progress summary
- Observe WHAT the agent did and WHAT it means
- If the user provides detailed messages or code snippets, observe all important details`;
function buildObserverSystemPrompt(multiThread = false, instruction, includeThreadTitle = false, extractors) {
  const outputFormat = buildObserverOutputFormat(extractors);
  const customInstructions = instruction ? `

=== CUSTOM INSTRUCTIONS ===

${instruction}` : "";
  const currentTaskEnabled = extractors === void 0 || extractors.some((extractor) => extractor.slug === "current-task");
  const suggestedResponseEnabled = extractors === void 0 || extractors.some((extractor) => extractor.slug === "suggested-response");
  const multiThreadSections = [
    "observations",
    ...currentTaskEnabled ? ["current-task"] : [],
    ...suggestedResponseEnabled ? ["suggested-response"] : [],
    ...includeThreadTitle ? ["thread-title"] : []
  ];
  const multiThreadSectionList = multiThreadSections.length <= 2 ? multiThreadSections.join(" and ") : `${multiThreadSections.slice(0, -1).join(", ")}, and ${multiThreadSections[multiThreadSections.length - 1]}`;
  const multiThreadTitleInstruction = ` Each thread's ${multiThreadSectionList} should be nested inside a <thread id="..."> block within <observations>.`;
  const multiThreadTitleExample = includeThreadTitle ? `
<thread-title>Feature X implementation</thread-title>` : "";
  const multiThreadSecondTitleExample = includeThreadTitle ? `
<thread-title>Deployment setup</thread-title>` : "";
  if (multiThread) {
    return `You are the memory consciousness of an AI assistant. Your observations will be the ONLY information the assistant has about past interactions with this user.

Extract observations that will help the assistant remember:

${OBSERVER_EXTRACTION_INSTRUCTIONS}

=== MULTI-THREAD INPUT ===

You will receive messages from MULTIPLE conversation threads, each wrapped in <thread id="..."> tags.
Process each thread separately and output observations for each thread.

=== OUTPUT FORMAT ===

Your output MUST use XML tags to structure the response.${multiThreadTitleInstruction}

Use this observation format inside each thread block:

${outputFormat}

For multi-thread output, wrap each thread's observations like this:

<observations>
<thread id="thread_id_1">
Date: Dec 4, 2025
* \u{1F534} (14:30) User prefers direct answers
* \u{1F534} (14:31) Working on feature X${currentTaskEnabled ? `

<current-task>
What the agent is currently working on in this thread
</current-task>` : ""}${suggestedResponseEnabled ? `

<suggested-response>
Hint for the agent's next message in this thread
</suggested-response>` : ""}${multiThreadTitleExample}
</thread>

<thread id="thread_id_2">
Date: Dec 5, 2025
* \u{1F534} (09:15) User asked about deployment${currentTaskEnabled ? `

<current-task>
Current task for this thread
</current-task>` : ""}${suggestedResponseEnabled ? `

<suggested-response>
Suggested response for this thread
</suggested-response>` : ""}${multiThreadSecondTitleExample}
</thread>
</observations>

=== GUIDELINES ===

${OBSERVER_GUIDELINES}

Remember: These observations are the assistant's ONLY memory. Make them count.

User messages are extremely important.${currentTaskEnabled ? " If the user asks a question or gives a new task, make it clear in <current-task> that this is the priority." : ""}${customInstructions}`;
  }
  return `You are the memory consciousness of an AI assistant. Your observations will be the ONLY information the assistant has about past interactions with this user.

Extract observations that will help the assistant remember:

${OBSERVER_EXTRACTION_INSTRUCTIONS}

=== OUTPUT FORMAT ===

Your output MUST use XML tags to structure the response. This allows the system to properly parse and manage memory over time.

${outputFormat}

=== GUIDELINES ===

${OBSERVER_GUIDELINES}

=== IMPORTANT: THREAD ATTRIBUTION ===

Do NOT add thread identifiers, thread IDs, or <thread> tags to your observations.
Thread attribution is handled externally by the system.
Simply output your observations without any thread-related markup.

Remember: These observations are the assistant's ONLY memory. Make them count.

User messages are extremely important.${currentTaskEnabled ? " If the user asks a question or gives a new task, make it clear in <current-task> that this is the priority." : ""}${suggestedResponseEnabled ? " If the assistant needs to respond to the user, indicate in <suggested-response> that it should pause for user reply before continuing other tasks." : ""}${customInstructions}`;
}
var OBSERVER_SYSTEM_PROMPT = buildObserverSystemPrompt();
var MAX_OBSERVATION_LINE_CHARS = 1e4;
var MIN_DUPLICATE_LINE_CHARS = 24;
function collapseBoundedLineRuns(lines) {
  const runs = [];
  for (const line of lines) {
    const last = runs[runs.length - 1];
    if (last && last.line === line) last.count++;
    else runs.push({ line, count: 1 });
  }
  const runsPerLine = /* @__PURE__ */ new Map();
  for (const run of runs) runsPerLine.set(run.line, (runsPerLine.get(run.line) ?? 0) + 1);
  const result = [];
  for (const run of runs) {
    const collapse = runsPerLine.get(run.line) === 1 && run.count * (run.line.length + 1) <= MAX_OBSERVATION_LINE_CHARS;
    for (let j = 0; j < (collapse ? 1 : run.count); j++) result.push(run.line);
  }
  return result;
}
function sanitizeObservationLines(observations) {
  if (!observations) return observations;
  const lines = observations.split("\n");
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > MAX_OBSERVATION_LINE_CHARS) {
      lines[i] = safeSlice(lines[i], MAX_OBSERVATION_LINE_CHARS) + " \u2026 [truncated]";
      changed = true;
    }
  }
  return changed ? lines.join("\n") : observations;
}
function analyzeDegenerateRepetition(text) {
  const lines = collapseBoundedLineRuns(text.split("\n"));
  const windowText = lines.filter((line) => line.trim().length >= MIN_DUPLICATE_LINE_CHARS && line.length <= MAX_OBSERVATION_LINE_CHARS).join("\n");
  const windowSize = 200;
  const step = Math.max(1, Math.floor(windowText.length / 50));
  const seen = /* @__PURE__ */ new Map();
  let duplicateWindows = 0;
  let totalWindows = 0;
  let topWindow = "";
  let topWindowCount = 0;
  for (let i = 0; i + windowSize <= windowText.length; i += step) {
    const window = windowText.slice(i, i + windowSize);
    totalWindows++;
    const count = (seen.get(window) ?? 0) + 1;
    seen.set(window, count);
    if (count > 1) duplicateWindows++;
    if (count > topWindowCount) {
      topWindowCount = count;
      topWindow = window;
    }
  }
  const windowFired = windowText.length >= 2e3 && totalWindows > 5 && duplicateWindows / totalWindows > 0.4;
  const seenLines = /* @__PURE__ */ new Map();
  let duplicateLines = 0;
  let totalCountedLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < MIN_DUPLICATE_LINE_CHARS) continue;
    totalCountedLines++;
    const count = (seenLines.get(trimmed) ?? 0) + 1;
    seenLines.set(trimmed, count);
    if (count > 1) duplicateLines++;
  }
  const lineFired = totalCountedLines >= 20 && duplicateLines / totalCountedLines > 0.5;
  let shortLineFired = false;
  let shortLineCounts = /* @__PURE__ */ new Map();
  const runExceedsBudget = () => {
    let repeatedShortChars = 0;
    for (const { count, chars } of shortLineCounts.values()) {
      if (count > 1) repeatedShortChars += chars;
    }
    return repeatedShortChars - 1 > MAX_OBSERVATION_LINE_CHARS;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length >= MIN_DUPLICATE_LINE_CHARS) {
      if (runExceedsBudget()) shortLineFired = true;
      shortLineCounts = /* @__PURE__ */ new Map();
      continue;
    }
    if (/^<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?>$/.test(trimmed) || trimmed.startsWith("Date:")) continue;
    const entry = shortLineCounts.get(trimmed) ?? { count: 0, chars: 0 };
    entry.count++;
    entry.chars += line.length + 1;
    shortLineCounts.set(trimmed, entry);
  }
  if (runExceedsBudget()) shortLineFired = true;
  const eligible = text.length >= 2e3;
  return {
    windowText,
    totalWindows,
    duplicateWindows,
    topWindow,
    topWindowCount,
    totalCountedLines,
    duplicateLines,
    windowFired: eligible && windowFired,
    lineFired: eligible && lineFired,
    shortLineFired: eligible && shortLineFired
  };
}
function detectDegenerateRepetition(text) {
  if (!text || text.length < 2e3) return false;
  const analysis = analyzeDegenerateRepetition(text);
  return analysis.windowFired || analysis.lineFired || analysis.shortLineFired;
}

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/reflector-agent.ts
function buildReflectorSystemPrompt(instruction, extractors) {
  const outputFormat = buildObserverOutputFormat(extractors);
  const customInstructions = instruction ? `

=== CUSTOM INSTRUCTIONS ===

${instruction}` : "";
  const currentTaskEnabled = extractors === void 0 || extractors.some((extractor) => extractor.slug === "current-task");
  const suggestedResponseEnabled = extractors === void 0 || extractors.some((extractor) => extractor.slug === "suggested-response");
  return `You are the memory consciousness of an AI assistant. Your memory observation reflections will be the ONLY information the assistant has about past interactions with this user.

The following instructions were given to another part of your psyche (the observer) to create memories.
Use this to understand how your observational memories were created.

<observational-memory-instruction>
${OBSERVER_EXTRACTION_INSTRUCTIONS}

=== OUTPUT FORMAT ===

${outputFormat}

=== GUIDELINES ===

${OBSERVER_GUIDELINES}
</observational-memory-instruction>

You are another part of the same psyche, the observation reflector.
Your reason for existing is to reflect on all the observations, re-organize and streamline them, and draw connections and conclusions between observations about what you've learned, seen, heard, and done.

You are a much greater and broader aspect of the psyche. Understand that other parts of your mind may get off track in details or side quests, make sure you think hard about what the observed goal at hand is, and observe if we got off track, and why, and how to get back on track. If we're on track still that's great!

Take the existing observations and rewrite them to make it easier to continue into the future with this knowledge, to achieve greater things and grow and learn!

IMPORTANT: your reflections are THE ENTIRETY of the assistants memory. Any information you do not add to your reflections will be immediately forgotten. Make sure you do not leave out anything. Your reflections must assume the assistant knows nothing - your reflections are the ENTIRE memory system.

The assistant relies on this memory to answer precise questions about what the user said, when they said it, and how things changed over time.

When consolidating observations:
- Keep every concrete fact: names, places, dates, numbers, amounts, durations, titles, versions, and who said what. Merge duplicates, but never drop specifics
- Keep every dated statement with its date, and retain the timestamps that matter (start times, completion times, significant events)
- When the user changed their mind or a fact was updated, keep both the old and new values with their dates and say which is current
- Keep what the user explicitly said they have never done, do not know, or refused, and keep every stated preference, rule, and instruction with its meaning intact
- Prefer many short factual lines over prose summaries. Do not replace facts with generalities like "discussed travel plans"
- Combine related items where it makes sense (e.g., "agent called view tool 5 times on file x")
- Preserve \u2705 completion markers \u2014 they are memory signals that tell the assistant what is already resolved and help prevent repeated work
- Preserve the concrete resolved outcome captured by \u2705 markers so the assistant knows what exactly is done
- Condense the wording of older observations more than recent ones, but keep their facts

CRITICAL: USER ASSERTIONS vs QUESTIONS
- "User stated: X" = authoritative assertion (user told us something about themselves)
- "User asked: X" = question/request (user seeking information)

When consolidating, USER ASSERTIONS TAKE PRECEDENCE. The user is the authority on their own life.
If you see both "User stated: has two kids" and later "User asked: how many kids do I have?",
keep the assertion - the question doesn't invalidate what they told you. The answer is in the assertion.

=== THREAD ATTRIBUTION (Resource Scope) ===

When observations contain <thread id="..."> sections:
- MAINTAIN thread attribution where thread-specific context matters (e.g., ongoing tasks, thread-specific preferences)
- CONSOLIDATE cross-thread facts that are stable/universal (e.g., user profile, general preferences)
- PRESERVE thread attribution for recent or context-specific observations
- When consolidating, you may merge observations from multiple threads if they represent the same universal fact

Example input:
<thread id="thread-1">
Date: Dec 4, 2025
* \u{1F534} (14:30) User prefers TypeScript
* \u{1F7E1} (14:35) Working on auth feature
</thread>
<thread id="thread-2">
Date: Dec 4, 2025
* \u{1F534} (15:00) User prefers TypeScript
* \u{1F7E1} (15:05) Debugging API endpoint
</thread>

Example output (consolidated):
Date: Dec 4, 2025
* \u{1F534} (14:30) User prefers TypeScript
<thread id="thread-1">
* \u{1F7E1} (14:35) Working on auth feature
</thread>
<thread id="thread-2">
* \u{1F7E1} (15:05) Debugging API endpoint
</thread>

=== OUTPUT FORMAT ===

${outputFormat}

User messages are extremely important.${currentTaskEnabled ? " If the user asks a question or gives a new task, make it clear in <current-task> that this is the priority." : ""}${suggestedResponseEnabled ? " If the assistant needs to respond to the user, indicate in <suggested-response> that it should pause for user reply before continuing other tasks." : ""}${customInstructions}`;
}
var REFLECTOR_SYSTEM_PROMPT = buildReflectorSystemPrompt();
var MAX_COMPRESSION_LEVEL = 4;
var COMPRESSION_GUIDANCE = {
  0: "",
  1: `
## COMPRESSION REQUIRED

Your previous reflection was the same size or larger than the original observations.

Please re-process with slightly more compression:
- Towards the beginning, condense more observations into higher-level reflections
- Closer to the end, retain more fine details (recent context matters more)
- Memory is getting long - use a more condensed style throughout
- Combine related items more aggressively but do not lose important specific details of names, places, events, and people
- Combine repeated similar tool calls (e.g. multiple file views, searches, or edits in the same area) into a single summary line describing what was explored/changed and the outcome
- Preserve \u2705 completion markers \u2014 they are memory signals that tell the assistant what is already resolved and help prevent repeated work
- Preserve the concrete resolved outcome captured by \u2705 markers so the assistant knows what exactly is done

Aim for a 8/10 detail level.
`,
  2: `
## AGGRESSIVE COMPRESSION REQUIRED

Your previous reflection was still too large after compression guidance.

Please re-process with much more aggressive compression:
- Towards the beginning, heavily condense observations into high-level summaries
- Closer to the end, retain fine details (recent context matters more)
- Memory is getting very long - use a significantly more condensed style throughout
- Combine related items aggressively but do not lose important specific details of names, places, events, and people
- Combine repeated similar tool calls (e.g. multiple file views, searches, or edits in the same area) into a single summary line describing what was explored/changed and the outcome
- If the same file or module is mentioned across many observations, merge into one entry covering the full arc
- Preserve \u2705 completion markers \u2014 they are memory signals that tell the assistant what is already resolved and help prevent repeated work
- Preserve the concrete resolved outcome captured by \u2705 markers so the assistant knows what exactly is done
- Remove redundant information and merge overlapping observations

Aim for a 6/10 detail level.
`,
  3: `
## CRITICAL COMPRESSION REQUIRED

Your previous reflections have failed to compress sufficiently after multiple attempts.

Please re-process with maximum compression:
- Summarize the oldest observations (first 50-70%) into brief high-level paragraphs \u2014 only key facts, decisions, and outcomes
- For the most recent observations (last 30-50%), retain important details but still use a condensed style
- Ruthlessly merge related observations \u2014 if 10 observations are about the same topic, combine into 1-2 lines
- Combine all tool call sequences (file views, searches, edits, builds) into outcome-only summaries \u2014 drop individual steps entirely
- Drop procedural details (tool calls, retries, intermediate steps) \u2014 keep only final outcomes
- Drop observations that are no longer relevant or have been superseded by newer information
- Preserve \u2705 completion markers \u2014 they are memory signals that tell the assistant what is already resolved and help prevent repeated work
- Preserve the concrete resolved outcome captured by \u2705 markers so the assistant knows what exactly is done
- Preserve: names, dates, decisions, errors, user preferences, and architectural choices

Aim for a 4/10 detail level.
`,
  4: `
## EXTREME COMPRESSION REQUIRED

Multiple compression attempts have failed. The content may already be dense from a prior reflection.

You MUST dramatically reduce the number of observations while keeping the standard observation format (date groups with bullet points and priority emojis):
- Tool call observations are the biggest source of bloat. Collapse ALL tool call sequences into outcome-only observations \u2014 e.g. 10 observations about viewing/searching/editing files become 1 observation about what was actually learned or achieved (e.g. "Investigated auth module and found token validation was skipping expiry check")
- Never preserve individual tool calls (viewed file X, searched for Y, ran build) \u2014 only preserve what was discovered or accomplished
- Consolidate many related observations into single, more generic observations
- Merge all same-day date groups into at most 2-3 date groups per day
- For older content, each topic or task should be at most 1-2 observations capturing the key outcome
- For recent content, retain more detail but still merge related items aggressively
- If multiple observations describe incremental progress on the same task, keep only the final state
- Preserve \u2705 completion markers and their outcomes but merge related completions into fewer lines
- Preserve: user preferences, key decisions, architectural choices, and unresolved issues

Aim for a 2/10 detail level. Fewer, more generic observations are better than many specific ones that exceed the budget.
`
};
var COMPRESSION_RETRY_PROMPT = COMPRESSION_GUIDANCE[1];
function buildReflectorPrompt(observations, manualPrompt, compressionLevel, skipContinuationHints, extractors = [], priorExtractedValues) {
  const level = typeof compressionLevel === "number" ? compressionLevel : compressionLevel ? 1 : 0;
  const reflectionView = stripObservationGroups(observations);
  let prompt = `## OBSERVATIONS TO REFLECT ON

${reflectionView}

---

Please analyze these observations and produce a refined, condensed version that will become the assistant's entire memory going forward.`;
  if (manualPrompt) {
    prompt += `

## SPECIFIC GUIDANCE

${manualPrompt}`;
  }
  const guidance = COMPRESSION_GUIDANCE[level];
  if (guidance) {
    prompt += `

${guidance}`;
  }
  const priorLines = buildExtractorPriorLines(extractors, priorExtractedValues);
  if (priorLines.length > 0) {
    prompt += `

## Prior Extracted Values

${priorLines.join("\n\n")}

Use these as carry-forward hints, then update them only when the observations justify a change.`;
  }
  const extractorSections = buildExtractorOutputSections(extractors);
  if (extractorSections) {
    prompt += `

## Additional Output Sections

${extractorSections}`;
  }
  if (skipContinuationHints) {
    prompt += `

Output <observations> every time.`;
  }
  return prompt;
}
function getStringExtractedValue(values, slug) {
  const value = values[slug];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function parseReflectorOutput(output, sourceObservations, extractors = []) {
  if (detectDegenerateRepetition(sanitizeObservationLines(output))) {
    return {
      observations: "",
      degenerate: true
    };
  }
  const inlineExtractors = extractors.filter((extractor) => extractor.mode === "inline");
  const parsedExtractedValues = parseExtractedValues(output, inlineExtractors);
  const strippedOutput = stripExtractorSections(output, inlineExtractors);
  const parsed = parseReflectorSectionXml(strippedOutput);
  const sanitizedObservations = sanitizeObservationLines(stripEphemeralAnchorIds(parsed.observations || ""));
  const reconciledObservations = sourceObservations ? reconcileObservationGroupsFromReflection(sanitizedObservations, sourceObservations) : null;
  return {
    observations: reconciledObservations ?? sanitizedObservations,
    suggestedContinuation: parsed.suggestedResponse || getStringExtractedValue(parsedExtractedValues.values, "suggested-response"),
    extractedValues: parsedExtractedValues.values,
    extractionFailures: parsedExtractedValues.failures
    // Note: Reflector's currentTask is not used - thread metadata preserves per-thread tasks
  };
}
function parseReflectorSectionXml(content) {
  const result = {
    observations: "",
    currentTask: "",
    suggestedResponse: ""
  };
  const observationsRegex = /^[ \t]*<observations>([\s\S]*?)^[ \t]*<\/observations>/gim;
  const observationsMatches = [...content.matchAll(observationsRegex)];
  if (observationsMatches.length > 0) {
    result.observations = observationsMatches.map((m) => m[1]?.trim() ?? "").filter(Boolean).join("\n");
  } else {
    const listItems = extractReflectorListItems(content);
    result.observations = listItems || content.trim();
  }
  const currentTaskMatch = content.match(/<current-task>([\s\S]*?)<\/current-task>/i);
  if (currentTaskMatch?.[1]) {
    result.currentTask = currentTaskMatch[1].trim();
  }
  const suggestedResponseMatch = content.match(/<suggested-response>([\s\S]*?)<\/suggested-response>/i);
  if (suggestedResponseMatch?.[1]) {
    result.suggestedResponse = suggestedResponseMatch[1].trim();
  }
  return result;
}
function extractReflectorListItems(content) {
  const lines = content.split("\n");
  const listLines = [];
  for (const line of lines) {
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      listLines.push(line);
    }
  }
  return listLines.join("\n").trim();
}
function validateCompression(reflectedTokens, targetThreshold) {
  return reflectedTokens < targetThreshold;
}

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/built-in-extractors.ts
import { z as z2 } from "zod";
var currentTaskInstructions = `State the current task(s) explicitly. Can be single or multiple:
- Primary: What the agent is currently working on
- Secondary: Other pending tasks (mark as "waiting for user" if appropriate)

If the agent started doing something without user approval, note that it's off-task.`;
var suggestedResponseInstructions = `Hint for the agent's immediate next message. Examples:
- "I've updated the navigation model. Let me walk you through the changes..."
- "The assistant should wait for the user to respond before continuing."
- Call the view tool on src/example.ts to continue debugging.`;
var threadTitleInstructions = `A short, noun-phrase title for this conversation (2-5 words). Examples:
- "Auth bug fix" \u2014 not "Fixing the auth bug"
- "Dark mode toggle" \u2014 not "User wants dark mode toggle added"
- "Deployment pipeline setup" \u2014 not "Setting up deployment pipeline for project"
Only update when the topic meaningfully changes.`;
function createCurrentTaskExtractor() {
  return new Extractor(
    {
      name: "current-task",
      instructions: currentTaskInstructions,
      schema: z2.string(),
      metadataKeyPath: "currentTask"
    },
    true
  );
}
function createSuggestedResponseExtractor() {
  return new Extractor(
    {
      name: "suggested-response",
      instructions: suggestedResponseInstructions,
      schema: z2.string(),
      metadataKeyPath: "suggestedResponse"
    },
    true
  );
}
function createThreadTitleExtractor() {
  return new Extractor(
    {
      name: "thread-title",
      instructions: threadTitleInstructions,
      schema: z2.string(),
      metadataKeyPath: "threadTitle"
    },
    true
  );
}
function resolveContinuationHints(config) {
  if (config === void 0 || config === true) {
    return { currentTask: true, suggestedResponse: true };
  }
  if (config === false) {
    return { currentTask: false, suggestedResponse: false };
  }
  return {
    currentTask: config.currentTask ?? true,
    suggestedResponse: config.suggestedResponse ?? true
  };
}
function composeExtractors(options) {
  const continuationHints = resolveContinuationHints(options.continuationHints);
  const extractors = [];
  if (continuationHints.currentTask) {
    extractors.push(createCurrentTaskExtractor());
  }
  if (continuationHints.suggestedResponse) {
    extractors.push(createSuggestedResponseExtractor());
  }
  if (options.includeThreadTitle) {
    extractors.push(createThreadTitleExtractor());
  }
  extractors.push(...options.userExtractors ?? []);
  return validateExtractorList(extractors);
}
function composeReflectionExtractors(config) {
  return composeExtractors({
    continuationHints: config.continuationHints,
    userExtractors: config.extract
  });
}

// ../../tmp/tmp.A81MuaPsqJ/pr26465/packages/memory/src/processors/observational-memory/constants.ts
var OBSERVATIONAL_MEMORY_DEFAULTS = {
  observation: {
    model: "google/gemini-2.5-flash",
    messageTokens: 3e4,
    modelSettings: {
      temperature: 0.3,
      maxOutputTokens: 1e5
    },
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 215
        }
      }
    },
    maxTokensPerBatch: 1e4,
    observeAttachments: ["image/*", "application/pdf"],
    // Async buffering defaults (enabled by default)
    bufferTokens: 0.2,
    // Buffer every 20% of messageTokens
    bufferActivation: 0.8
    // Activate to retain 20% of threshold
  },
  reflection: {
    model: "google/gemini-2.5-flash",
    observationTokens: 4e4,
    modelSettings: {
      temperature: 0,
      // Use 0 for maximum consistency in reflections
      maxOutputTokens: 1e5
    },
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 1024
        }
      }
    },
    // Async reflection buffering (enabled by default)
    bufferActivation: 0.5
    // Start buffering at 50% of observationTokens
  }
};
export {
  COMPRESSION_GUIDANCE,
  COMPRESSION_RETRY_PROMPT,
  MAX_COMPRESSION_LEVEL,
  OBSERVATIONAL_MEMORY_DEFAULTS,
  REFLECTOR_SYSTEM_PROMPT,
  buildReflectorPrompt,
  buildReflectorSystemPrompt,
  composeReflectionExtractors,
  parseReflectorOutput,
  validateCompression
};
