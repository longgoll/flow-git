pub mod ast_node;
pub mod conflict_engine;
pub mod diff_engine;
pub mod parser;
pub mod symbol_extractor;

pub use ast_node::{
    AstResolveResult, SemanticConflictAnalysis, SemanticConflictChunkAnalysis,
    SemanticConflictChunkKind, SemanticDiffResult, SemanticMove, SemanticSymbol, SemanticSymbolKind,
};
pub use conflict_engine::{analyze_conflicts, auto_resolve_file_ast};
pub use diff_engine::compute_semantic_diff;
pub use parser::{create_parser, parse_code, SupportedLanguage};
pub use symbol_extractor::extract_symbols;

#[cfg(test)]
mod tests;
