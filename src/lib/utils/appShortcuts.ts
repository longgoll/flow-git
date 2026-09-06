import type { WorkspaceTab, ViewMode } from '../types';
import type { WorkspaceTabState } from '../state/workspaceTabState.svelte';
import type { ModalState } from '../state/modalState.svelte';

export interface ShortcutHandlers {
  tabState: WorkspaceTabState;
  modalState: ModalState;
  viewMode: () => ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onCloseTab: (tabId: string) => void;
  onToggleSidebar: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onStageOrUnstageSelected?: () => void;
}

export function handleAppKeydown(e: KeyboardEvent, handlers: ShortcutHandlers) {
  const isInputActive = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

  // Command Palette: Ctrl+K / Cmd+K
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    handlers.modalState.showCommandPalette = !handlers.modalState.showCommandPalette;
    return;
  }

  // Guide / Help: F1 or Ctrl+/
  if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
    e.preventDefault();
    handlers.modalState.showGuideModal = !handlers.modalState.showGuideModal;
    return;
  }

  // Toggle Sidebar: Ctrl+B / Cmd+B
  if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
    e.preventDefault();
    handlers.onToggleSidebar();
    return;
  }

  // Undo (Safe-Flight Time Machine): Ctrl+Z / Cmd+Z
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey && !isInputActive) {
    e.preventDefault();
    handlers.onUndo();
    return;
  }

  // Redo: Ctrl+Y or Ctrl+Shift+Z
  if (
    (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) &&
    !isInputActive
  ) {
    e.preventDefault();
    handlers.onRedo();
    return;
  }

  // Switch ViewModes: Ctrl+1 (Graph), Ctrl+2 (Changes)
  if ((e.ctrlKey || e.metaKey) && e.key === '1') {
    e.preventDefault();
    handlers.onChangeViewMode('graph');
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '2') {
    e.preventDefault();
    handlers.onChangeViewMode('changes');
    return;
  }

  // Cycle Tabs: Ctrl+Tab / Ctrl+Shift+Tab
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    const target = e.shiftKey ? handlers.tabState.prevTab() : handlers.tabState.nextTab();
    if (target) {
      handlers.onSelectTab(target);
    }
    return;
  }

  // Close Active Tab: Ctrl+W / Cmd+W (when more than 1 tab)
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === 'w' || e.key === 'W') &&
    !isInputActive &&
    handlers.tabState.tabs.length > 1
  ) {
    e.preventDefault();
    if (handlers.tabState.activeTabId) {
      handlers.onCloseTab(handlers.tabState.activeTabId);
    }
    return;
  }

  // Jump directly to tab: Alt+1..9
  if (e.altKey && e.key >= '1' && e.key <= '9' && !isInputActive) {
    const idx = parseInt(e.key, 10) - 1;
    if (idx >= 0 && idx < handlers.tabState.tabs.length) {
      e.preventDefault();
      const target = handlers.tabState.tabs[idx];
      handlers.onSelectTab(target);
    }
    return;
  }

  // Space to Stage/Unstage selected file in Working Tree
  if (e.key === ' ' && !isInputActive) {
    if (handlers.viewMode() === 'changes' && handlers.onStageOrUnstageSelected) {
      e.preventDefault();
      handlers.onStageOrUnstageSelected();
    }
  }
}
