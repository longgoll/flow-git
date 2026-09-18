use std::collections::BTreeSet;

use crate::git::conflict::ConflictChunk;
use crate::git::semantic::ast_node::{
    AstResolveResult, SemanticConflictAnalysis, SemanticConflictChunkAnalysis,
    SemanticConflictChunkKind,
};
use crate::git::semantic::parser::{parse_code, SupportedLanguage};
use crate::git::semantic::symbol_extractor::extract_symbols;

pub fn analyze_conflicts(
    file_path: &str,
    chunks: &[ConflictChunk],
) -> SemanticConflictAnalysis {
    let lang = match SupportedLanguage::from_path(file_path) {
        Some(l) => l,
        None => {
            let chunk_analyses = chunks
                .iter()
                .filter(|c| c.is_conflict)
                .map(|c| SemanticConflictChunkAnalysis {
                    chunk_index: c.chunk_index,
                    kind: SemanticConflictChunkKind::NonAstConflict,
                    can_auto_resolve: false,
                    explanation: "File extension not supported for AST analysis".to_string(),
                    proposed_content: None,
                })
                .collect::<Vec<_>>();

            let total = chunk_analyses.len();
            return SemanticConflictAnalysis {
                file_path: file_path.to_string(),
                language: "unknown".to_string(),
                total_conflicts: total,
                ast_solvable_count: 0,
                chunks: chunk_analyses,
                full_auto_resolvable: false,
            };
        }
    };

    let mut chunk_analyses = Vec::new();
    let mut solvable_count = 0;

    for chunk in chunks.iter().filter(|c| c.is_conflict) {
        let analysis = analyze_single_chunk(chunk, lang);
        if analysis.can_auto_resolve {
            solvable_count += 1;
        }
        chunk_analyses.push(analysis);
    }

    let total_conflicts = chunk_analyses.len();
    let full_auto_resolvable = total_conflicts > 0 && solvable_count == total_conflicts;

    SemanticConflictAnalysis {
        file_path: file_path.to_string(),
        language: lang.name().to_string(),
        total_conflicts,
        ast_solvable_count: solvable_count,
        chunks: chunk_analyses,
        full_auto_resolvable,
    }
}

fn is_import_block(content: &str, lang: SupportedLanguage) -> bool {
    let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();
    if lines.is_empty() {
        return false;
    }

    lines.iter().all(|line| {
        let trimmed = line.trim();
        match lang {
            SupportedLanguage::TypeScript | SupportedLanguage::Tsx | SupportedLanguage::JavaScript => {
                trimmed.starts_with("import ") || trimmed.starts_with("from ") || trimmed.starts_with("import{") || trimmed.starts_with("}from") || trimmed.starts_with("//")
            }
            SupportedLanguage::Rust => {
                trimmed.starts_with("use ") || trimmed.starts_with("pub use ") || trimmed.starts_with("//")
            }
            SupportedLanguage::Python => {
                trimmed.starts_with("import ") || trimmed.starts_with("from ") || trimmed.starts_with("#")
            }
        }
    })
}

fn merge_imports(ours: &str, theirs: &str) -> String {
    let mut set = BTreeSet::new();
    for line in ours.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            set.insert(trimmed.to_string());
        }
    }
    for line in theirs.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            set.insert(trimmed.to_string());
        }
    }
    set.into_iter().collect::<Vec<_>>().join("\n")
}

fn analyze_single_chunk(chunk: &ConflictChunk, lang: SupportedLanguage) -> SemanticConflictChunkAnalysis {
    let base_trimmed = chunk.base_content.trim();
    let ours_trimmed = chunk.our_content.trim();
    let theirs_trimmed = chunk.their_content.trim();

    // Check Case 1: Import Block Collision
    if is_import_block(&chunk.our_content, lang) && is_import_block(&chunk.their_content, lang) {
        let proposed = merge_imports(&chunk.our_content, &chunk.their_content);
        return SemanticConflictChunkAnalysis {
            chunk_index: chunk.chunk_index,
            kind: SemanticConflictChunkKind::AstSolvableImports,
            can_auto_resolve: true,
            explanation: "Tự động gộp và sắp xếp các câu lệnh imports không trùng lặp".to_string(),
            proposed_content: Some(proposed),
        };
    }

    // Check Case 2: Independent Additions (base is empty or small whitespace, both added distinct entities)
    if base_trimmed.is_empty() && !ours_trimmed.is_empty() && !theirs_trimmed.is_empty() {
        let ours_symbols = extract_symbols(&chunk.our_content, lang);
        let theirs_symbols = extract_symbols(&chunk.their_content, lang);

        if !ours_symbols.is_empty() && !theirs_symbols.is_empty() {
            let ours_names: std::collections::HashSet<_> = ours_symbols.iter().map(|s| &s.name).collect();
            let theirs_names: std::collections::HashSet<_> = theirs_symbols.iter().map(|s| &s.name).collect();

            let has_overlap = ours_names.intersection(&theirs_names).count() > 0;
            if !has_overlap {
                let proposed = format!("{}\n\n{}", ours_trimmed, theirs_trimmed);
                return SemanticConflictChunkAnalysis {
                    chunk_index: chunk.chunk_index,
                    kind: SemanticConflictChunkKind::AstSolvableIndependentAddition,
                    can_auto_resolve: true,
                    explanation: format!(
                        "Hai nhánh thêm các hàm/lớp độc lập ({:?} và {:?})",
                        ours_names.into_iter().collect::<Vec<_>>(),
                        theirs_names.into_iter().collect::<Vec<_>>()
                    ),
                    proposed_content: Some(proposed),
                };
            }
        }
    }

    // Default: Colliding modification requiring manual choice
    SemanticConflictChunkAnalysis {
        chunk_index: chunk.chunk_index,
        kind: SemanticConflictChunkKind::AstCollidingModification,
        can_auto_resolve: false,
        explanation: "Cả 2 nhánh cùng chỉnh sửa thực thể cú pháp trùng nhau".to_string(),
        proposed_content: None,
    }
}

pub fn auto_resolve_file_ast(
    file_path: &str,
    chunks: &[ConflictChunk],
) -> AstResolveResult {
    let lang = match SupportedLanguage::from_path(file_path) {
        Some(l) => l,
        None => {
            return AstResolveResult {
                file_path: file_path.to_string(),
                success: false,
                resolved_content: None,
                applied_chunks: 0,
                syntax_valid: false,
                error_message: Some("Ngôn ngữ tệp tin không hỗ trợ giải quyết tự động bằng AST".to_string()),
            }
        }
    };

    let mut applied_count = 0;
    let mut resolved_lines = Vec::new();

    for chunk in chunks {
        if !chunk.is_conflict {
            let non_conflict = if !chunk.our_content.is_empty() {
                &chunk.our_content
            } else {
                &chunk.their_content
            };
            resolved_lines.push(non_conflict.clone());
        } else {
            let analysis = analyze_single_chunk(chunk, lang);
            if analysis.can_auto_resolve && analysis.proposed_content.is_some() {
                resolved_lines.push(analysis.proposed_content.unwrap());
                applied_count += 1;
            } else {
                // If chunk is not solvable, fallback to ours for dry-run
                resolved_lines.push(chunk.our_content.clone());
            }
        }
    }

    let joined_code = resolved_lines.join("\n");

    // Syntax Validation Guard: Parse result with tree-sitter
    let syntax_valid = match parse_code(&joined_code, lang) {
        Some(tree) => !tree.root_node().has_error(),
        None => false,
    };

    if !syntax_valid {
        return AstResolveResult {
            file_path: file_path.to_string(),
            success: false,
            resolved_content: None,
            applied_chunks: 0,
            syntax_valid: false,
            error_message: Some("Cây AST sau khi gộp phát hiện lỗi cú pháp, đã tự động hủy để đảm bảo an toàn".to_string()),
        };
    }

    AstResolveResult {
        file_path: file_path.to_string(),
        success: true,
        resolved_content: Some(joined_code),
        applied_chunks: applied_count,
        syntax_valid: true,
        error_message: None,
    }
}
