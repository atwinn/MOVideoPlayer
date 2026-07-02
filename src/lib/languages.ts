/// Common language options for preference selects. mpv/ffmpeg track
/// metadata uses ISO 639-2 (3-letter) codes, which is what these values
/// map to so they line up with `Track.lang` when matching is added later.
export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "eng", label: "English" },
  { code: "vie", label: "Vietnamese" },
  { code: "jpn", label: "Japanese" },
  { code: "kor", label: "Korean" },
  { code: "zho", label: "Chinese" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "spa", label: "Spanish" },
  { code: "por", label: "Portuguese" },
  { code: "rus", label: "Russian" },
  { code: "tha", label: "Thai" },
  { code: "ind", label: "Indonesian" },
];
