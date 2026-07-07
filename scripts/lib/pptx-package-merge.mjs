import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const SLIDE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
const SLIDE_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const NOTES_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml";

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function packagePath(partName) {
  return partName.replace(/^\/+/, "");
}

function normalizePart(partName) {
  return `/${packagePath(path.posix.normalize(partName))}`;
}

function relsPathForPart(partName) {
  const normalized = normalizePart(partName);
  const dir = path.posix.dirname(packagePath(normalized));
  const base = path.posix.basename(normalized);
  return path.posix.join(dir, "_rels", `${base}.rels`);
}

function parseAttributes(xmlTag) {
  const attrs = {};
  for (const match of xmlTag.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function parseRelationships(xml) {
  return [...xml.matchAll(/<Relationship\b[^>]*\/>/g)].map((match) => parseAttributes(match[0]));
}

function buildRelationshipsXml(relationships) {
  const body = relationships
    .map((rel) => {
      const attrs = Object.entries(rel)
        .map(([key, value]) => `${key}="${String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`)
        .join(" ");
      return `<Relationship ${attrs} />`;
    })
    .join("");
  return `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="${REL_NS}">${body}</Relationships>`;
}

async function readXml(root, partName) {
  return fs.readFile(path.join(root, packagePath(partName)), "utf8");
}

async function writeXml(root, partName, xml) {
  const file = path.join(root, packagePath(partName));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, xml);
}

function resolveTarget(fromPartName, target) {
  if (target.startsWith("/")) {
    return normalizePart(target);
  }
  const fromDir = path.posix.dirname(normalizePart(fromPartName));
  return normalizePart(path.posix.join(fromDir, target));
}

function extensionOf(partName) {
  return path.posix.extname(partName).slice(1).toLowerCase();
}

function parseContentTypes(xml) {
  const defaults = new Map();
  const overrides = new Map();
  for (const match of xml.matchAll(/<Default\b[^>]*\/>/g)) {
    const attrs = parseAttributes(match[0]);
    if (attrs.Extension && attrs.ContentType) {
      defaults.set(attrs.Extension.toLowerCase(), attrs.ContentType);
    }
  }
  for (const match of xml.matchAll(/<Override\b[^>]*\/>/g)) {
    const attrs = parseAttributes(match[0]);
    if (attrs.PartName && attrs.ContentType) {
      overrides.set(normalizePart(attrs.PartName), attrs.ContentType);
    }
  }
  return { xml, defaults, overrides };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contentTypeFor(contentTypes, partName) {
  const normalized = normalizePart(partName);
  return contentTypes.overrides.get(normalized) ?? contentTypes.defaults.get(extensionOf(normalized));
}

function addDefaultContentType(state, extension, contentType) {
  const key = extension.toLowerCase();
  if (!contentType || state.defaults.has(key)) {
    return;
  }
  state.defaults.set(key, contentType);
  state.xml = state.xml.replace(
    "</Types>",
    `<Default Extension="${key}" ContentType="${contentType}" /></Types>`,
  );
}

function addOverrideContentType(state, partName, contentType) {
  const normalized = normalizePart(partName);
  if (!contentType) {
    return;
  }
  if (state.overrides.has(normalized)) {
    if (state.overrides.get(normalized) !== contentType) {
      state.overrides.set(normalized, contentType);
      const pattern = new RegExp(`<Override\\b(?=[^>]*PartName="${escapeRegExp(normalized)}")[^>]*/>`);
      state.xml = state.xml.replace(
        pattern,
        `<Override PartName="${normalized}" ContentType="${contentType}" />`,
      );
    }
    return;
  }
  state.overrides.set(normalized, contentType);
  state.xml = state.xml.replace(
    "</Types>",
    `<Override PartName="${normalized}" ContentType="${contentType}" /></Types>`,
  );
}

function addContentType(state, sourceTypes, partName, forcedContentType) {
  const normalized = normalizePart(partName);
  const contentType = forcedContentType ?? contentTypeFor(sourceTypes, normalized);
  if (!contentType) {
    return;
  }

  if (normalized.endsWith(".xml")) {
    addOverrideContentType(state, normalized, contentType);
  } else {
    addDefaultContentType(state, extensionOf(normalized), contentType);
  }
}

async function copyFilePart(sourceRoot, destRoot, sourcePart, destPart) {
  const sourceFile = path.join(sourceRoot, packagePath(sourcePart));
  const destFile = path.join(destRoot, packagePath(destPart));
  await fs.mkdir(path.dirname(destFile), { recursive: true });
  await fs.copyFile(sourceFile, destFile);
}

async function nextUniquePartName(destRoot, folderPart, originalPart, prefix) {
  const ext = path.posix.extname(originalPart);
  const base = path.posix.basename(originalPart, ext).replace(/[^A-Za-z0-9_-]/g, "_");
  for (let i = 0; ; i += 1) {
    const suffix = i === 0 ? "" : `-${i}`;
    const candidate = normalizePart(path.posix.join(folderPart, `${prefix}-${base}${suffix}${ext}`));
    if (!(await pathExists(path.join(destRoot, packagePath(candidate))))) {
      return candidate;
    }
  }
}

function shouldReuseSharedPart(relType, targetPart, destRoot) {
  if (!relType) {
    return false;
  }
  const sharedTypes = [
    "/slideLayout",
    "/slideMaster",
    "/notesMaster",
    "/theme",
    "/presProps",
    "/tableStyles",
  ];
  return sharedTypes.some((suffix) => relType.endsWith(suffix))
    && pathExists(path.join(destRoot, packagePath(targetPart)));
}

async function copyRelatedPart({
  sourceRoot,
  destRoot,
  sourceTypes,
  destTypes,
  sourcePart,
  destPart,
  prefix,
  noteSlideTarget,
  copiedParts,
}) {
  sourcePart = normalizePart(sourcePart);
  destPart = normalizePart(destPart);
  const copyKey = `${sourceRoot}:${sourcePart}->${destPart}`;
  if (copiedParts.has(copyKey)) {
    return;
  }
  copiedParts.add(copyKey);

  await copyFilePart(sourceRoot, destRoot, sourcePart, destPart);
  addContentType(destTypes, sourceTypes, destPart);

  const sourceRelsPath = relsPathForPart(sourcePart);
  const sourceRelsFile = path.join(sourceRoot, sourceRelsPath);
  if (!(await pathExists(sourceRelsFile))) {
    return;
  }

  const relationships = parseRelationships(await fs.readFile(sourceRelsFile, "utf8"));
  for (const rel of relationships) {
    if (rel.TargetMode === "External" || !rel.Target) {
      continue;
    }

    const targetPart = resolveTarget(sourcePart, rel.Target);
    if (noteSlideTarget && rel.Type === SLIDE_REL_TYPE) {
      rel.Target = noteSlideTarget;
      continue;
    }

    if (await shouldReuseSharedPart(rel.Type, targetPart, destRoot)) {
      rel.Target = targetPart;
      continue;
    }

    const folder = path.posix.dirname(targetPart);
    const childDestPart = await nextUniquePartName(destRoot, folder, targetPart, prefix);
    await copyRelatedPart({
      sourceRoot,
      destRoot,
      sourceTypes,
      destTypes,
      sourcePart: targetPart,
      destPart: childDestPart,
      prefix,
      copiedParts,
    });
    rel.Target = childDestPart;
  }

  const destRelsPath = relsPathForPart(destPart);
  await writeXml(destRoot, `/${destRelsPath}`, buildRelationshipsXml(relationships));
}

async function unzipTo(pptxPath, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  await execFileAsync("unzip", ["-q", pptxPath, "-d", outDir]);
}

async function zipDir(inDir, outPath) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.rm(outPath, { force: true });
  await execFileAsync("zip", ["-q", "-r", outPath, "."], { cwd: inDir });
}

function presentationSlideOrder(presentationXml, presentationRelsXml) {
  const relationships = parseRelationships(presentationRelsXml);
  const targetByRid = new Map(relationships.map((rel) => [rel.Id, rel.Target]));
  const slides = [];
  for (const match of presentationXml.matchAll(/<p:sldId\b[^>]*\/>/g)) {
    const attrs = parseAttributes(match[0]);
    const rid = attrs["r:id"];
    const target = rid ? targetByRid.get(rid) : undefined;
    if (target) {
      slides.push(resolveTarget("/ppt/presentation.xml", target));
    }
  }
  return slides;
}

function maxSlideNumber(root) {
  return fs.readdir(path.join(root, "ppt", "slides")).then((entries) => {
    let max = 0;
    for (const entry of entries) {
      const match = entry.match(/^slide(\d+)\.xml$/);
      if (match) {
        max = Math.max(max, Number(match[1]));
      }
    }
    return max;
  });
}

function maxRelationshipNumber(relationships) {
  let max = 0;
  for (const rel of relationships) {
    const match = String(rel.Id ?? "").match(/(\d+)$/);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return max;
}

function maxSlideId(presentationXml) {
  let max = 255;
  for (const match of presentationXml.matchAll(/<p:sldId\b[^>]*\/>/g)) {
    const attrs = parseAttributes(match[0]);
    if (attrs.id) {
      max = Math.max(max, Number(attrs.id));
    }
  }
  return max;
}

async function copyImportedSlide({
  sourceRoot,
  destRoot,
  sourceTypes,
  destTypes,
  sourceSlidePart,
  destSlidePart,
  prefix,
}) {
  await copyFilePart(sourceRoot, destRoot, sourceSlidePart, destSlidePart);
  addContentType(destTypes, sourceTypes, destSlidePart, SLIDE_CONTENT_TYPE);

  const sourceRelsPath = relsPathForPart(sourceSlidePart);
  const sourceRelsFile = path.join(sourceRoot, sourceRelsPath);
  if (!(await pathExists(sourceRelsFile))) {
    return;
  }

  const relationships = parseRelationships(await fs.readFile(sourceRelsFile, "utf8"));
  const copiedParts = new Set();
  const slideNumber = path.posix.basename(destSlidePart, ".xml").replace("slide", "");

  for (const rel of relationships) {
    if (rel.TargetMode === "External" || !rel.Target) {
      continue;
    }

    const targetPart = resolveTarget(sourceSlidePart, rel.Target);
    if (await shouldReuseSharedPart(rel.Type, targetPart, destRoot)) {
      rel.Target = targetPart;
      continue;
    }

    let destPart;
    if (rel.Type?.endsWith("/notesSlide")) {
      destPart = normalizePart(`/ppt/notesSlides/notesSlide${slideNumber}.xml`);
      if (await pathExists(path.join(destRoot, packagePath(destPart)))) {
        destPart = await nextUniquePartName(destRoot, "/ppt/notesSlides", targetPart, prefix);
      }
      await copyRelatedPart({
        sourceRoot,
        destRoot,
        sourceTypes,
        destTypes,
        sourcePart: targetPart,
        destPart,
        prefix,
        noteSlideTarget: destSlidePart,
        copiedParts,
      });
      addContentType(destTypes, sourceTypes, destPart, NOTES_CONTENT_TYPE);
    } else {
      destPart = await nextUniquePartName(destRoot, path.posix.dirname(targetPart), targetPart, prefix);
      await copyRelatedPart({
        sourceRoot,
        destRoot,
        sourceTypes,
        destTypes,
        sourcePart: targetPart,
        destPart,
        prefix,
        copiedParts,
      });
    }
    rel.Target = destPart;
  }

  const destRelsPath = relsPathForPart(destSlidePart);
  await writeXml(destRoot, `/${destRelsPath}`, buildRelationshipsXml(relationships));
}

export async function mergePptxPackages(inputPaths, outPath) {
  if (inputPaths.length === 0) {
    throw new Error("No PPTX files provided for merge.");
  }

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwen-pptx-merge-"));
  try {
    const expanded = [];
    for (const [index, pptxPath] of inputPaths.entries()) {
      const sectionDir = path.join(tmpRoot, `section-${index + 1}`);
      await unzipTo(pptxPath, sectionDir);
      expanded.push(sectionDir);
    }

    const destRoot = path.join(tmpRoot, "merged");
    await fs.cp(expanded[0], destRoot, { recursive: true });

    let destPresentationXml = await readXml(destRoot, "/ppt/presentation.xml");
    let destPresentationRels = parseRelationships(await readXml(destRoot, "/ppt/_rels/presentation.xml.rels"));
    const destTypes = parseContentTypes(await readXml(destRoot, "/[Content_Types].xml"));

    let nextSlideNum = (await maxSlideNumber(destRoot)) + 1;
    let nextRelNum = maxRelationshipNumber(destPresentationRels) + 1;
    let nextSlideId = maxSlideId(destPresentationXml) + 1;

    for (let sourceIndex = 1; sourceIndex < expanded.length; sourceIndex += 1) {
      const sourceRoot = expanded[sourceIndex];
      const sourceTypes = parseContentTypes(await readXml(sourceRoot, "/[Content_Types].xml"));
      const sourcePresentationXml = await readXml(sourceRoot, "/ppt/presentation.xml");
      const sourcePresentationRelsXml = await readXml(sourceRoot, "/ppt/_rels/presentation.xml.rels");
      const slideParts = presentationSlideOrder(sourcePresentationXml, sourcePresentationRelsXml);

      for (const sourceSlidePart of slideParts) {
        const destSlidePart = normalizePart(`/ppt/slides/slide${nextSlideNum}.xml`);
        const prefix = `merge-s${sourceIndex + 1}-${nextSlideNum}`;
        await copyImportedSlide({
          sourceRoot,
          destRoot,
          sourceTypes,
          destTypes,
          sourceSlidePart,
          destSlidePart,
          prefix,
        });

        const rid = `RmergedSlide${nextRelNum}`;
        destPresentationRels.push({
          Type: SLIDE_REL_TYPE,
          Target: destSlidePart,
          Id: rid,
        });
        destPresentationXml = destPresentationXml.replace(
          "</p:sldIdLst>",
          `<p:sldId id="${nextSlideId}" r:id="${rid}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" /></p:sldIdLst>`,
        );

        nextSlideNum += 1;
        nextRelNum += 1;
        nextSlideId += 1;
      }
    }

    await writeXml(destRoot, "/ppt/presentation.xml", destPresentationXml);
    await writeXml(destRoot, "/ppt/_rels/presentation.xml.rels", buildRelationshipsXml(destPresentationRels));
    await writeXml(destRoot, "/[Content_Types].xml", destTypes.xml);
    await zipDir(destRoot, outPath);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}
