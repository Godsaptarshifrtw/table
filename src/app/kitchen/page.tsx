"use client";

import { useCallback, useEffect, useState } from "react";
import { ChefHat } from "lucide-react";
import { StaffNavbar } from "@/components/StaffNavbar";
import { useKitchenOrders } from "@/features/kitchen/hooks/useKitchenOrders";
import KitchenToolbar from "@/features/kitchen/components/KitchenToolbar";
import KitchenBoard from "@/features/kitchen/components/KitchenBoard";
import type { KitchenFilter } from "@/features/kitchen/utils/kitchenUtils";

export default function KitchenDisplayPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState<KitchenFilter>("active");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    orders,
    loading,
    error,
    updatingItems,
    fetchOrders,
    updateItemStatus,
  } = useKitchenOrders(soundEnabled);

  useEffect(() => {
    const playNotification = () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as Window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) return;

        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(587.33, context.currentTime);
        oscillator.frequency.setValueAtTime(880, context.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 0.4
        );

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => void context.close();

        oscillator.start();
        oscillator.stop(context.currentTime + 0.4);
      } catch {
        // Audio may be blocked by browser autoplay policy.
      }
    };

    window.addEventListener("kitchen:new-order", playNotification);
    return () =>
      window.removeEventListener("kitchen:new-order", playNotification);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be unavailable in the current browser context.
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <StaffNavbar />

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
            <ChefHat className="h-5 w-5" />
          </div>

          <div>
            <h1 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
              Kitchen Display Station (KDS)
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            </h1>
            <p className="text-[11px] text-slate-500">
              Live kitchen tickets · Auto-sync every 3 seconds
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchOrders()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh orders
        </button>
      </header>

      <KitchenToolbar
        filter={filter}
        onFilterChange={setFilter}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((enabled) => !enabled)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={() => void toggleFullscreen()}
      />

      <KitchenBoard
        orders={orders}
        loading={loading}
        error={error}
        filter={filter}
        updatingItems={updatingItems}
        onRefresh={() => void fetchOrders()}
        onUpdateItemStatus={updateItemStatus}
      />
    </div>
  );
}