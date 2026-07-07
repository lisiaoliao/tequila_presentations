import { buildSectionDeck, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("02");

// Section-specific edits for 02 背景与目标 go here.
// This section owns: divider 02, optimization background, goal/challenge slides.

await saveSectionDeck("02", deck);
