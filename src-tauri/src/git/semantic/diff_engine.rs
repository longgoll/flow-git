use crate::git::semantic::ast_node::{SemanticDiffResult, SemanticMove};
use crate::git::semantic::parser::SupportedLanguage;
use crate::git::semantic::symbol_extractor::extract_symbols;

pub fn compute_semantic_diff(
    file_path: &str,
    old_content: Option<&str>,
    new_content: Option<&str>,
) -> SemanticDiffResult {
    let lang = match SupportedLanguage::from_path(file_path) {
        Some(l) => l,
        None => {
            return SemanticDiffResult {
                file_path: file_path.to_string(),
                language: "unknown".to_string(),
                has_semantic_data: false,
                moves: Vec::new(),
                modified_symbols: Vec::new(),
                added_symbols: Vec::new(),
                deleted_symbols: Vec::new(),
                summary: "Language not supported for AST diff".to_string(),
            }
        }
    };

    let old_str = old_content.unwrap_or("");
    let new_str = new_content.unwrap_or("");

    let old_symbols = extract_symbols(old_str, lang);
    let new_symbols = extract_symbols(new_str, lang);

    let mut moves = Vec::new();
    let mut modified_symbols = Vec::new();
    let mut added_symbols = Vec::new();
    let mut deleted_symbols = Vec::new();

    // Track matched symbols
    let mut matched_new_indices = std::collections::HashSet::new();

    for old_sym in &old_symbols {
        // Find matching symbol in new_symbols with same name and kind
        let matching_new = new_symbols
            .iter()
            .enumerate()
            .find(|(i, s)| !matched_new_indices.contains(i) && s.name == old_sym.name && s.kind == old_sym.kind);

        if let Some((idx, new_sym)) = matching_new {
            matched_new_indices.insert(idx);

            if old_sym.body_hash == new_sym.body_hash {
                // Same content: check if line changed significantly (> 2 lines difference)
                let line_diff = (old_sym.start_line as i64 - new_sym.start_line as i64).abs();
                if line_diff >= 3 {
                    moves.push(SemanticMove {
                        symbol_name: old_sym.name.clone(),
                        kind: old_sym.kind,
                        old_start_line: old_sym.start_line,
                        old_end_line: old_sym.end_line,
                        new_start_line: new_sym.start_line,
                        new_end_line: new_sym.end_line,
                        is_identical: true,
                        similarity: 1.0,
                    });
                }
            } else {
                modified_symbols.push(old_sym.name.clone());
            }
        } else {
            deleted_symbols.push(old_sym.name.clone());
        }
    }

    // Any new symbols not matched from old are added
    for (idx, new_sym) in new_symbols.iter().enumerate() {
        if !matched_new_indices.contains(&idx) {
            added_symbols.push(new_sym.name.clone());
        }
    }

    let mut summary_parts = Vec::new();
    if !moves.is_empty() {
        summary_parts.push(format!("{} moved", moves.len()));
    }
    if !modified_symbols.is_empty() {
        summary_parts.push(format!("{} modified", modified_symbols.len()));
    }
    if !added_symbols.is_empty() {
        summary_parts.push(format!("{} added", added_symbols.len()));
    }
    if !deleted_symbols.is_empty() {
        summary_parts.push(format!("{} deleted", deleted_symbols.len()));
    }

    let summary = if summary_parts.is_empty() {
        "No semantic entity changes detected".to_string()
    } else {
        summary_parts.join(", ")
    };

    SemanticDiffResult {
        file_path: file_path.to_string(),
        language: lang.name().to_string(),
        has_semantic_data: true,
        moves,
        modified_symbols,
        added_symbols,
        deleted_symbols,
        summary,
    }
}
