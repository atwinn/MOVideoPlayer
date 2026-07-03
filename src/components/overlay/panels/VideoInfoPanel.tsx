import { useEffect, useState } from "react";

import { mpvVideoInfo } from "../../../lib/tauriCommands";
import type { VideoInfo } from "../../../lib/types";

function formatBitrate(bps: number | null): string | null {
  if (!bps) return null;
  return `${(bps / 1000).toFixed(0)} kbps`;
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-white/60">{label}</span>
      <span className="truncate text-right tabular-nums">{value}</span>
    </div>
  );
}

export function VideoInfoPanel() {
  const [info, setInfo] = useState<VideoInfo | null>(null);

  useEffect(() => {
    void mpvVideoInfo().then(setInfo).catch(() => setInfo(null));
  }, []);

  if (!info) {
    return <div className="w-64 text-xs text-white/60">Loading…</div>;
  }

  const resolution = info.width && info.height ? `${info.width}×${info.height}` : null;

  return (
    <div className="flex w-64 flex-col gap-1.5">
      <Row label="File" value={info.filename} />
      <Row label="Container" value={info.container} />
      <Row label="Video codec" value={info.video_codec} />
      <Row label="Resolution" value={resolution} />
      <Row label="Frame rate" value={info.fps ? `${info.fps.toFixed(2)} fps` : null} />
      <Row label="Video bitrate" value={formatBitrate(info.video_bitrate)} />
      <Row label="Hardware decode" value={info.hwdec && info.hwdec !== "no" ? info.hwdec : "Software"} />
      <Row label="Audio codec" value={info.audio_codec} />
      <Row label="Audio channels" value={info.audio_channels ? String(info.audio_channels) : null} />
      <Row
        label="Sample rate"
        value={info.audio_samplerate ? `${(info.audio_samplerate / 1000).toFixed(1)} kHz` : null}
      />
      <Row label="Audio bitrate" value={formatBitrate(info.audio_bitrate)} />
    </div>
  );
}
