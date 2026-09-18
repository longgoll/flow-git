import { invoke } from '@tauri-apps/api/core';
import type {
  AstResolveResult,
  SemanticConflictAnalysis,
  SemanticDiffResult,
} from '../types';
import { isTauri } from './client';

export async function getSemanticDiff(
  path: string,
  filePath: string,
  staged: boolean = false,
  oldContent?: string,
  newContent?: string
): Promise<SemanticDiffResult> {
  if (isTauri) {
    return await invoke<SemanticDiffResult>('get_semantic_diff', {
      path,
      filePath,
      staged,
      oldContent: oldContent ?? null,
      newContent: newContent ?? null,
    });
  }

  // Web fallback simulation
  return {
    file_path: filePath,
    language: 'typescript',
    has_semantic_data: true,
    moves: [
      {
        symbol_name: 'parseConfig',
        kind: 'function',
        old_start_line: 12,
        old_end_line: 25,
        new_start_line: 85,
        new_end_line: 98,
        is_identical: true,
        similarity: 1.0,
      },
    ],
    modified_symbols: ['initApp'],
    added_symbols: ['fetchUserRoles'],
    deleted_symbols: [],
    summary: '1 moved, 1 modified, 1 added',
  };
}

export async function analyzeSemanticConflicts(
  path: string,
  filePath: string
): Promise<SemanticConflictAnalysis> {
  if (isTauri) {
    return await invoke<SemanticConflictAnalysis>('analyze_semantic_conflicts', {
      path,
      filePath,
    });
  }

  return {
    file_path: filePath,
    language: 'typescript',
    total_conflicts: 1,
    ast_solvable_count: 1,
    chunks: [
      {
        chunk_index: 0,
        kind: 'ast_solvable_independent_addition',
        can_auto_resolve: true,
        explanation: 'Hai nhánh cùng thêm các hàm độc lập không trùng tên',
      },
    ],
    full_auto_resolvable: true,
  };
}

export async function autoResolveAstConflicts(
  path: string,
  filePath: string,
  dryRun: boolean = false
): Promise<AstResolveResult> {
  if (isTauri) {
    return await invoke<AstResolveResult>('auto_resolve_ast_conflicts', {
      path,
      filePath,
      dryRun,
    });
  }

  return {
    file_path: filePath,
    success: true,
    resolved_content: '// Resolved with AST\nexport const version = "1.2.0";',
    applied_chunks: 1,
    syntax_valid: true,
  };
}
