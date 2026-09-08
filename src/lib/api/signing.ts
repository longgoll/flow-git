import { invoke } from '@tauri-apps/api/core';
import type { SignatureInfo, SigningConfig } from '../types';
import { isTauri } from './client';

export async function getCommitSignature(path: string, commitId: string): Promise<SignatureInfo> {
  if (isTauri) {
    return await invoke<SignatureInfo>('get_commit_signature', { path, commitId });
  }
  return {
    is_signed: true,
    key_type: 'ssh',
    signer: 'Mock Signer <developer@example.com>',
    signature: '-----BEGIN SSH SIGNATURE-----\nU1NIU0lHAAAA...mock\n-----END SSH SIGNATURE-----',
  };
}

export async function getSigningConfig(path: string): Promise<SigningConfig> {
  if (isTauri) {
    return await invoke<SigningConfig>('get_signing_config', { path });
  }
  return {
    gpg_sign: false,
    gpg_format: 'ssh',
    signing_key: undefined,
    available_ssh_keys: ['C:/Users/User/.ssh/id_ed25519.pub', 'C:/Users/User/.ssh/id_rsa.pub'],
  };
}

export async function setSigningConfig(
  path: string,
  gpgSign: boolean,
  gpgFormat: string,
  signingKey?: string,
  isGlobal?: boolean,
): Promise<SigningConfig> {
  if (isTauri) {
    return await invoke<SigningConfig>('set_signing_config', {
      path,
      gpgSign,
      gpgFormat,
      signingKey: signingKey || null,
      isGlobal: isGlobal ?? false,
    });
  }
  return {
    gpg_sign: gpgSign,
    gpg_format: gpgFormat,
    signing_key: signingKey,
    available_ssh_keys: ['C:/Users/User/.ssh/id_ed25519.pub', 'C:/Users/User/.ssh/id_rsa.pub'],
  };
}
