<script lang="ts">
  import { toast } from '../state/toastState.svelte';
  import {
    CheckCircle2,
    AlertCircle,
    Info,
    AlertTriangle,
    X,
    RotateCcw,
  } from 'lucide-svelte';

  function getToastConfig(type: string) {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/40',
          bgColor: 'bg-emerald-950/20',
          glow: 'shadow-emerald-950/40',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-rose-400',
          borderColor: 'border-rose-500/40',
          bgColor: 'bg-rose-950/20',
          glow: 'shadow-rose-950/40',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          borderColor: 'border-amber-500/40',
          bgColor: 'bg-amber-950/20',
          glow: 'shadow-amber-950/40',
        };
      default:
        return {
          icon: Info,
          iconColor: 'text-cyan-400',
          borderColor: 'border-cyan-500/40',
          bgColor: 'bg-cyan-950/20',
          glow: 'shadow-cyan-950/40',
        };
    }
  }
</script>

<div class="fixed bottom-10 right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full font-sans select-none">
  {#each toast.items as item (item.id)}
    {@const cfg = getToastConfig(item.type)}
    <div
      class="pointer-events-auto w-full p-3.5 rounded-xl bg-zinc-900/95 border {cfg.borderColor} {cfg.bgColor} backdrop-blur-md shadow-xl {cfg.glow} flex items-start gap-3 transition-all duration-200 animate-in slide-in-from-bottom-3 fade-in-80"
      role="alert"
    >
      <!-- Icon -->
      <div class="shrink-0 mt-0.5">
        <svelte:component this={cfg.icon} class="w-4 h-4 {cfg.iconColor}" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0 pr-1">
        <div class="text-xs font-bold text-zinc-100 leading-snug truncate">
          {item.title}
        </div>
        {#if item.message}
          <div class="text-[11px] text-zinc-300/85 mt-0.5 leading-normal break-words">
            {item.message}
          </div>
        {/if}

        <!-- Interactive Action Button (e.g. Undo Ctrl+Z) -->
        {#if item.action}
          <div class="mt-2 flex items-center gap-2">
            <button
              onclick={() => {
                item.action?.onClick();
                toast.dismiss(item.id);
              }}
              class="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs {item.action.variant === 'danger'
                ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-600/50'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 hover:scale-102 active:scale-98'}"
            >
              <RotateCcw class="w-3 h-3 text-cyan-300" />
              <span>{item.action.label}</span>
            </button>
          </div>
        {/if}
      </div>

      <!-- Dismiss Button -->
      <button
        onclick={() => toast.dismiss(item.id)}
        class="shrink-0 p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 rounded-md transition-colors cursor-pointer"
        title="Đóng thông báo"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  {/each}
</div>
