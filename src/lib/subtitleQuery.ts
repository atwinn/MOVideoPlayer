/// Heuristic filename -> subtitle-search-query cleanup. Release names pack
/// resolution/source/codec/group tags after the title; this cuts the
/// string at the earliest such marker and drops bracketed junk, but it's
/// still a guess — the search box built on top of this stays editable
/// rather than locking the suggestion in.
const JUNK_PATTERN =
  /\b(2160p|1080p|720p|480p|4k|uhd|bluray|blu-ray|web[- ]?dl|webrip|web|hdtv|dvdrip|brrip|hdrip|hdcam|cam|x264|x265|h264|h265|hevc|avc|aac\d?|dts(-hd)?|ac3|atmos|remux|proper|repack|extended|unrated|directors?[- ]?cut|multi|dual|dubbed|subbed)\b/i;
const EPISODE_PATTERN = /\bS\d{1,2}E\d{1,3}\b|\b\d{1,2}x\d{2,3}\b/i;

export function suggestSubtitleQuery(fileNameOrPath: string): string {
  const base = fileNameOrPath.split(/[/\\]/).pop() ?? fileNameOrPath;
  let name = base.replace(/\.[a-z0-9]{2,4}$/i, "");
  name = name.replace(/[._]/g, " ");

  const cutoffs = [JUNK_PATTERN, EPISODE_PATTERN]
    .map((re) => name.search(re))
    .filter((i) => i >= 0);
  const cutoff = cutoffs.length > 0 ? Math.min(...cutoffs) : name.length;

  let query = name.slice(0, cutoff);
  query = query.replace(/[[({].*$/, "");
  query = query.replace(/\s+/g, " ").trim().replace(/[-\s]+$/, "");
  return query;
}
