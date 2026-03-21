import { useState, useCallback, useRef, useEffect } from 'react';
import { setVolume } from '../lib/ipc';

interface VolumeSliderProps {
  volume: number;
  onError?: (message: string) => void;
}

export function VolumeSlider({ volume: externalVolume, onError }: VolumeSliderProps) {
  const [volume, setLocalVolume] = useState(externalVolume);
  const previousVolumeRef = useRef(externalVolume > 0 ? externalVolume : 1.0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when external volume changes (e.g. session restore)
  useEffect(() => {
    setLocalVolume(externalVolume);
    if (externalVolume > 0) {
      previousVolumeRef.current = externalVolume;
    }
  }, [externalVolume]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const sendVolume = useCallback((level: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setVolume(level).catch((err) => {
        onError?.(String(err));
      });
    }, 50);
  }, [onError]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const level = parseFloat(e.target.value);
    setLocalVolume(level);
    if (level > 0) previousVolumeRef.current = level;
    sendVolume(level);
  }, [sendVolume]);

  const handleMuteToggle = useCallback(() => {
    const isMuted = volume === 0;
    const restoreLevel = previousVolumeRef.current;
    const next = isMuted ? restoreLevel : 0;
    if (!isMuted && volume > 0) {
      previousVolumeRef.current = volume;
    }
    setLocalVolume(next);
    sendVolume(next);
  }, [volume, sendVolume]);

  const percentage = Math.round(volume * 100);
  const isMuted = volume === 0;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleMuteToggle}
        className="flex items-center justify-center min-w-[32px] min-h-[32px] text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeMutedIcon /> : volume < 0.5 ? <VolumeLowIcon /> : <VolumeHighIcon />}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={handleChange}
        className="volume-slider flex-1 h-1.5 appearance-none bg-surface-container rounded-full cursor-pointer accent-primary"
        aria-label={`Master volume ${percentage}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      />

      <span className="font-body text-label-sm text-on-surface-variant w-8 text-right tabular-nums">
        {percentage}%
      </span>
    </div>
  );
}

function VolumeHighIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function VolumeLowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function VolumeMutedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
