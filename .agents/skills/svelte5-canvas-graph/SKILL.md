---
name: svelte5-canvas-graph
description: >-
  Hướng dẫn và tiêu chuẩn code Frontend Svelte 5 (Runes), Tailwind CSS v4, Bits UI và HTML5 OffscreenCanvas + Web Worker để render Living Commit Graph (> 50,000 commits) ổn định 60fps, Diff Viewer và Ghost Preview Kéo - Thả. Kích hoạt khi code giao diện Frontend, Canvas và tương tác UI/UX.
---

# KỸ NĂNG: SVELTE 5 RUNES & OFFSCREENCANVAS WORKER GRAPH (2026 EDITION)

Kỹ năng này định hình cấu trúc, phong cách code Svelte 5 và kỹ thuật dựng đồ thị tương tác cao cấp không gây nghẽn main-thread cho ứng dụng Git GUI.

---

## 1. NGUYÊN TẮC SVELTE 5 RUNES & DỮ LIỆU LỚN

1. **Sử dụng 100% Svelte 5 Runes:**
   - Dùng `$state()` cho reactive state thông thường.
   - **Bắt buộc dùng `$state.raw()` cho dữ liệu mảng lớn:** Khi tải 10,000 - 100,000 commits, `$state()` sẽ bọc Proxy quanh từng object gây tốn bộ nhớ. `$state.raw()` bỏ qua Proxy giúp truy xuất siêu tốc tương đương Javascript thuần.
   - Dùng `$derived()` cho computed state.
   - Dùng `$effect()` cho side-effects và cleanup event listeners.
   - Dùng `$props()` để định nghĩa component properties với TypeScript types.

2. **Styling & UI Primitives:**
   - **Tailwind CSS v4:** Sử dụng `@tailwindcss/vite` với CSS variables native.
   - **Bits UI / shadcn-svelte:** Làm nền tảng cho Context Menu, Tooltip, Dialog, Popover.

---

## 2. KIẾN TRÚC OFFSCREENCANVAS + WEB WORKER CHO COMMIT GRAPH

Tách biệt hoàn toàn việc render đồ thị ra Background Web Worker:

### Main Thread Component (`CommitGraph.svelte`):
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let canvasEl: HTMLCanvasElement;
  let worker: Worker;
  
  // Dùng $state.raw để không bị overhead Proxy trên mảng lớn
  let commits = $state.raw<CommitNode[]>([]);
  let scrollTop = $state(0);

  onMount(() => {
    // Chuyển quyền điều khiển Canvas sang Web Worker
    const offscreen = canvasEl.transferControlToOffscreen();
    worker = new Worker(new URL('./graphWorker.ts', import.meta.url), { type: 'module' });
    
    worker.postMessage({ type: 'INIT', canvas: offscreen }, [offscreen]);
  });

  function handleScroll(e: WheelEvent) {
    scrollTop += e.deltaY;
    worker.postMessage({ type: 'SCROLL', scrollTop });
  }

  onDestroy(() => {
    worker?.terminate();
  });
</script>

<div class="relative w-full h-full overflow-hidden" onwheel={handleScroll}>
  <canvas bind:this={canvasEl} class="w-full h-full block"></canvas>
</div>
```

### Worker Thread (`graphWorker.ts`):
```typescript
let ctx: OffscreenCanvasRenderingContext2D;
let scrollTop = 0;
const ROW_HEIGHT = 28;

self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'INIT') {
    ctx = e.data.canvas.getContext('2d')!;
    requestAnimationFrame(renderLoop);
  } else if (e.data.type === 'SCROLL') {
    scrollTop = e.data.scrollTop;
  }
};

function renderLoop() {
  // Chỉ tính toán và vẽ các commit nằm trong viewport
  // Sử dụng Bezier Splines mượt mà
  requestAnimationFrame(renderLoop);
}
```

---

## 3. MẪU THIẾT KẾ DRAG-AND-DROP TRÊN CANVAS VỚI GHOST PREVIEW

```typescript
interface DragState {
  isDragging: boolean;
  sourceCommitId: string | null;
  currentX: number;
  currentY: number;
  targetCommitId: string | null;
  conflictCount: number;
  isSimulating: boolean;
}

let dragState = $state<DragState>({
  isDragging: false,
  sourceCommitId: null,
  currentX: 0,
  currentY: 0,
  targetCommitId: null,
  conflictCount: 0,
  isSimulating: false,
});
```

- Khi kéo: Worker vẽ đường nét đứt `ctx.setLineDash([4, 4])` nối tới vị trí con trỏ chuột.
- Nếu `conflictCount > 0`: Đổi viền sang màu cam neon `#f97316` kèm visual indicator.

---

## 4. CHECKLIST TRƯỚC KHI SUBMIT CODE FRONTEND
- [ ] Dữ liệu commit log lớn dùng `$state.raw`.
- [ ] Khởi tạo canvas dùng `transferControlToOffscreen()` trước khi gọi bất kỳ context nào.
- [ ] Giao diện hỗ trợ Dark Theme chuẩn HSL, không gây chói mắt.
- [ ] Hỗ trợ High-DPI screens (`window.devicePixelRatio`).
