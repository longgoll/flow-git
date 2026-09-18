use tauri::command;
use crate::error::{AppError, AppResult};
use crate::git::{
    conflict::{get_conflict_details as git_get_conflict_details, resolve_conflict_file as git_resolve_conflict},
    diff::get_working_tree_file_diff,
    repo::open_repository as git_open_repo,
    semantic::{
        analyze_conflicts as git_analyze_conflicts,
        auto_resolve_file_ast as git_auto_resolve_file_ast,
        compute_semantic_diff as git_compute_semantic_diff,
        AstResolveResult, SemanticConflictAnalysis, SemanticDiffResult,
    },
};

#[command]
pub async fn get_semantic_diff(
    path: String,
    file_path: String,
    staged: bool,
    old_content: Option<String>,
    new_content: Option<String>,
) -> AppResult<SemanticDiffResult> {
    tokio::task::spawn_blocking(move || {
        let (original, modified) = if old_content.is_some() || new_content.is_some() {
            (old_content, new_content)
        } else {
            let repo = git_open_repo(&path)?;
            let file_diff = get_working_tree_file_diff(&repo, &file_path, staged, None)?;
            (file_diff.original_content, file_diff.modified_content)
        };

        Ok(git_compute_semantic_diff(
            &file_path,
            original.as_deref(),
            modified.as_deref(),
        ))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn analyze_semantic_conflicts(
    path: String,
    file_path: String,
) -> AppResult<SemanticConflictAnalysis> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let detail = git_get_conflict_details(&repo, &file_path)?;
        Ok(git_analyze_conflicts(&file_path, &detail.chunks))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn auto_resolve_ast_conflicts(
    path: String,
    file_path: String,
    dry_run: bool,
) -> AppResult<AstResolveResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let detail = git_get_conflict_details(&repo, &file_path)?;
        let result = git_auto_resolve_file_ast(&file_path, &detail.chunks);

        if !dry_run && result.success && result.resolved_content.is_some() {
            let content = result.resolved_content.as_ref().unwrap();
            git_resolve_conflict(&repo, &file_path, content)?;
        }

        Ok(result)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
