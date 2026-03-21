import { useCallback } from 'react';
import { SoundPad } from '@soundblart/ui';
import type { Panel } from '../lib/ipc';
import { playSound, stopSound } from '../lib/ipc';

interface SoundGridProps {
  panel: Panel | null;
  playingSoundPath: string | null;
  disabled?: boolean;
  onError?: (message: string) => void;
}

const MIN_SLOTS = 6;

export function SoundGrid({ panel, playingSoundPath, disabled = false, onError }: SoundGridProps) {
  const handlePadPress = useCallback(async (path: string) => {
    try {
      if (playingSoundPath === path) {
        await stopSound();
      } else {
        await playSound(path);
      }
    } catch (err) {
      onError?.(String(err));
    }
  }, [playingSoundPath, onError]);

  if (!panel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-body text-body-md text-on-surface-variant/60">
          No panel selected
        </p>
      </div>
    );
  }

  const sounds = panel.sounds ?? [];
  const emptySlots = Math.max(0, MIN_SLOTS - sounds.length);

  return (
    <div
      className="grid grid-cols-3 gap-3 overflow-y-auto flex-1 p-1"
      aria-label={`${panel.name} sound pads`}
    >
      {sounds.map((sound) => (
        <SoundPad
          key={sound.path}
          name={sound.name}
          index={sound.index}
          colorCategory={panel.colorCategory}
          isPlaying={playingSoundPath === sound.path}
          onPress={() => handlePadPress(sound.path)}
          disabled={disabled}
        />
      ))}

      {Array.from({ length: emptySlots }, (_, i) => (
        <div
          key={`${panel.name}-empty-${sounds.length + i}`}
          className="rounded-pad min-h-[100px] bg-surface-container/30"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
