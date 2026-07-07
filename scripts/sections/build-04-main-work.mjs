import { buildSectionDeck, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("04");

// Section-specific edits for 04 主要工作 go here.
// This section owns: divider 04, pipeline, Tokenizer, training, downstream tasks, constrained decoding.

await saveSectionDeck("04", deck);
