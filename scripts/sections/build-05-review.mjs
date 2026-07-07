import { buildSectionDeck, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("05");

// Section-specific edits for 05 效果与复盘 go here.
// This section owns: divider 05, summary, appendix pages, thanks page.

await saveSectionDeck("05", deck);
