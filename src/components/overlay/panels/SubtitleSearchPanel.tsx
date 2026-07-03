import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { downloadSubtitle, mpvLoadSubtitle, searchSubtitles } from "../../../lib/tauriCommands";
import { suggestSubtitleQuery } from "../../../lib/subtitleQuery";
import type { SubtitleSearchResult } from "../../../lib/types";
import { usePlayerStore } from "../../../store/playerStore";

const PROVIDER_LABEL: Record<SubtitleSearchResult["provider"], string> = {
  opensubtitles: "OpenSubtitles",
  subdl: "SubDL",
  subsource: "SubSource",
};

export function SubtitleSearchPanel() {
  const filePath = usePlayerStore((s) => s.filePath);
  const [query, setQuery] = useState(() => (filePath ? suggestSubtitleQuery(filePath) : ""));
  const [results, setResults] = useState<SubtitleSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    if (filePath) setQuery(suggestSubtitleQuery(filePath));
    // Only re-suggest when a new file loads — the box stays user-editable
    // afterward without being clobbered on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const found = await searchSubtitles(query.trim());
      setResults(found);
      if (found.length === 0) setError("No results — check that at least one provider has a valid API key set in Settings.");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const runDownload = async (result: SubtitleSearchResult, index: number) => {
    setDownloading(index);
    setError(null);
    try {
      const path = await downloadSubtitle(result);
      await mpvLoadSubtitle(path);
    } catch (err) {
      setError(String(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex w-80 flex-col gap-2.5">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          placeholder="Movie or show title"
          className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
        />
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={loading}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={`${result.provider}-${index}`}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate">{result.release_name}</p>
              <p className="text-white/50">
                {PROVIDER_LABEL[result.provider]} · {result.language}
              </p>
            </div>
            <button
              type="button"
              aria-label="Download and load"
              title="Download and load"
              onClick={() => void runDownload(result, index)}
              disabled={downloading === index}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              <Download size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
