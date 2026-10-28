"use client";

import { Bell, BellOff, Maximize, Minimize } from "lucide-react";
import type { KitchenFilter } from "../utils/kitchenUtils";

interface KitchenToolbarProps {
  filter: KitchenFilter;
  onFilterChange: (filter: KitchenFilter) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
}

const filters: { label: string; value: KitchenFilter }[] = [
  { label: "Active", value: "active" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "All Orders", value: "all" },
];

export default function KitchenToolbar({
  filter,
  onFilterChange,
  soundEnabled,
  onSoundToggle,
  isFullscreen,
  onFullscreenToggle,
}: KitchenToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onFilterChange(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === item.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSoundToggle}
          aria-label={soundEnabled ? "Disable order sound" : "Enable order sound"}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
        >
          {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
        </button>

        <button
          type="button"
          onClick={onFullscreenToggle}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </div>
  );
}