use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SemanticSymbolKind {
    Function,
    Method,
    Class,
    Struct,
    Interface,
    Enum,
    Import,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticSymbol {
    pub id: String,
    pub kind: SemanticSymbolKind,
    pub name: String,
    pub signature: String,
    pub start_line: usize,
    pub end_line: usize,
    pub body_hash: u64,
    pub raw_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticMove {
    pub symbol_name: String,
    pub kind: SemanticSymbolKind,
    pub old_start_line: usize,
    pub old_end_line: usize,
    pub new_start_line: usize,
    pub new_end_line: usize,
    pub is_identical: bool,
    pub similarity: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticDiffResult {
    pub file_path: String,
    pub language: String,
    pub has_semantic_data: bool,
    pub moves: Vec<SemanticMove>,
    pub modified_symbols: Vec<String>,
    pub added_symbols: Vec<String>,
    pub deleted_symbols: Vec<String>,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SemanticConflictChunkKind {
    AstSolvableIndependentAddition,
    AstSolvableImports,
    AstCollidingModification,
    NonAstConflict,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticConflictChunkAnalysis {
    pub chunk_index: usize,
    pub kind: SemanticConflictChunkKind,
    pub can_auto_resolve: bool,
    pub explanation: String,
    pub proposed_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticConflictAnalysis {
    pub file_path: String,
    pub language: String,
    pub total_conflicts: usize,
    pub ast_solvable_count: usize,
    pub chunks: Vec<SemanticConflictChunkAnalysis>,
    pub full_auto_resolvable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AstResolveResult {
    pub file_path: String,
    pub success: bool,
    pub resolved_content: Option<String>,
    pub applied_chunks: usize,
    pub syntax_valid: bool,
    pub error_message: Option<String>,
}
