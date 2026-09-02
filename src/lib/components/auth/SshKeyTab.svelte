<script lang="ts">
  import type { GitCredentials } from '../../types';

  let {
    onSuccess = (_creds: GitCredentials) => {},
    onCancel = () => {},
  }: {
    onSuccess: (creds: GitCredentials) => void;
    onCancel: () => void;
  } = $props();

  let sshPassphrase = $state('');
  let showPassword = $state(false);

  function handleSshSubmit(e: Event) {
    e.preventDefault();
    if (!sshPassphrase) return;
    onSuccess({
      auth_type: 'ssh_passphrase',
      ssh_passphrase: sshPassphrase,
    });
  }
</script>

<form onsubmit={handleSshSubmit} class="p-6 space-y-4">
  <div class="space-y-1.5">
    <label for="ssh-pass" class="text-xs font-medium text-neutral-300 block">
      Mật khẩu SSH Key (Passphrase)
    </label>
    <div class="relative">
      <input
        id="ssh-pass"
        type={showPassword ? 'text' : 'password'}
        bind:value={sshPassphrase}
        placeholder="Nhập passphrase cho file id_ed25519 / id_rsa..."
        class="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 pr-10 font-mono"
      />
      <button
        type="button"
        onclick={() => (showPassword = !showPassword)}
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
      >
        {showPassword ? 'Ẩn' : 'Hiện'}
      </button>
    </div>
    <p class="text-[11px] text-neutral-500">Mật khẩu được lưu trong phiên làm việc tạm thời và giải phóng khi thoát app.</p>
  </div>

  <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
    <button
      type="button"
      onclick={onCancel}
      class="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
    >
      Hủy bỏ
    </button>
    <button
      type="submit"
      disabled={!sshPassphrase}
      class="px-4 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
    >
      Xác nhận & Thử lại
    </button>
  </div>
</form>
