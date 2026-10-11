// All copy for the AI pomočnik module.
export const s = {
  title: "AI pomočnik",
  description: "Vprašaj karkoli. Odgovor je kratek, sledi lahko podvprašanje.",
  demoBadge: "Demo način",
  demoBadgeHint: "Odgovori so vzorčni, dokler lastnik ne poveže AI.",
  // Shown (and stored) instead of the engine's placeholder text in demo mode.
  demoAnswer:
    "To je vzorčni odgovor, ker AI še ni povezan. Ko ga lastnik poveže, boš tukaj dobil pravi odgovor na svoje vprašanje.",
  you: "Ti",
  assistant: "Pomočnik",
  thinking: "Razmišljam…",
  copy: "Kopiraj",
  composerLabel: "Tvoje vprašanje",
  composerPlaceholder: "Vprašaj karkoli…",
  composerHint: "Enter pošlje, Shift + Enter doda novo vrstico.",
  send: "Pošlji",
  emptyTitle: "Kaj te zanima?",
  emptyText: "Vprašaj z lastnimi besedami ali začni s predlogom.",
  suggestions: [
    "Napiši kratko, prijazno opomnilo stranki, ki zamuja s plačilom.",
    "Povzemi v treh točkah, kako se pripravim na prodajni sestanek.",
    "Predlagaj zadevo in uvod za e-pošto o novi storitvi.",
  ],
  errors: {
    empty: "Najprej napiši vprašanje.",
    tooLong: "Vprašanje je predolgo. Skrajšaj ga.",
    saveFailed: "Odgovora ni bilo mogoče shraniti. Poskusi znova.",
  },
  // The model's instructions. Slovenian in, Slovenian out.
  systemPrompt:
    "Si jedrnat notranji pomočnik v manjšem podjetju. Vedno odgovarjaj v slovenščini, v 3–5 stavkih, razen če uporabnik izrecno prosi za daljše besedilo, na primer osnutek e-pošte. Bodi konkreten in prijazen. Če nečesa ne veš, to povej in ne ugibaj.",
  historyIntro: "Dosedanji pogovor (za kontekst):",
  historyQuestion: "Vprašanje",
  historyAnswer: "Odgovor",
  newQuestion: "Novo vprašanje",
} as const;
