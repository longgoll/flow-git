use std::fs;
use git2::Repository;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::cli::silent_command;
use crate::git::conflict::get_conflicted_files;
use crate::git::rebase::{is_rebasing, RebaseExecutionResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebaseTodoItem {
    pub action: String, // "pick", "reword", "edit", "squash", "fixup", "drop"
    pub commit_id: String,
    pub short_id: String,
    pub summary: String,
    pub author: String,
}

/// Retrieve the chronological list of commits between `onto_commit_id` and HEAD for interactive rebase
pub fn prepare_interactive_rebase(
    repo: &Repository,
    onto_commit_id: &str,
) -> AppResult<Vec<RebaseTodoItem>> {
    let head = repo
        .head()?
        .target()
        .ok_or_else(|| AppError::InvalidRepo("HEAD target not found".into()))?;

    let onto_obj = repo.revparse_single(onto_commit_id)?;
    let onto_oid = onto_obj.id();

    let mut revwalk = repo.revwalk()?;
    revwalk.push(head)?;
    revwalk.hide(onto_oid)?;
    // Chronological order: oldest to newest
    revwalk.set_sorting(git2::Sort::TOPOLOGICAL | git2::Sort::REVERSE)?;

    let mut todos = Vec::new();
    for oid_res in revwalk {
        let oid = match oid_res {
            Ok(o) => o,
            Err(_) => continue,
        };

        if let Ok(commit) = repo.find_commit(oid) {
            let author = commit.author();
            let short_id = if oid.to_string().len() >= 7 {
                oid.to_string()[..7].to_string()
            } else {
                oid.to_string()
            };

            todos.push(RebaseTodoItem {
                action: "pick".to_string(),
                commit_id: oid.to_string(),
                short_id,
                summary: commit.summary().unwrap_or("").to_string(),
                author: author.name().unwrap_or("Unknown").to_string(),
            });
        }
    }

    Ok(todos)
}

/// Execute interactive rebase onto `onto_commit_id` using the user's customized todo list
pub fn execute_interactive_rebase(
    repo: &Repository,
    onto_commit_id: &str,
    todos: Vec<RebaseTodoItem>,
) -> AppResult<RebaseExecutionResult> {
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;

    if todos.is_empty() {
        return Err(AppError::InvalidRepo("Danh sách commits để rebase không được để trống.".into()));
    }

    // Check dirty working tree
    let mut status_opts = git2::StatusOptions::new();
    status_opts.include_untracked(false);
    let statuses = repo.statuses(Some(&mut status_opts))?;
    let dirty_count = statuses.iter().filter(|s| {
        let st = s.status();
        st.is_wt_modified() || st.is_wt_deleted() || st.is_index_modified() || st.is_index_new() || st.is_index_deleted()
    }).count();

    if dirty_count > 0 {
        return Err(AppError::InvalidRepo(
            "Thư mục làm việc chứa thay đổi chưa commit. Vui lòng commit hoặc stash trước khi Rebase.".into()
        ));
    }

    // Build the todo content
    let mut todo_content = String::new();
    for item in &todos {
        let act = item.action.to_lowercase();
        let valid_action = match act.as_str() {
            "pick" | "p" => "pick",
            "reword" | "r" => "reword",
            "edit" | "e" => "edit",
            "squash" | "s" => "squash",
            "fixup" | "f" => "fixup",
            "drop" | "d" => "drop",
            _ => "pick",
        };
        todo_content.push_str(&format!("{} {} {}\n", valid_action, item.short_id, item.summary));
    }

    // Write temporary todo file and sequence editor script
    let temp_dir = std::env::temp_dir();
    let pid = std::process::id();
    let todo_file_path = temp_dir.join(format!("flowgit_rebase_todo_{}.txt", pid));
    fs::write(&todo_file_path, todo_content)
        .map_err(|e| AppError::Internal(format!("Không thể tạo tệp todo tạm thời: {e}")))?;

    // Convert path to forward slashes for Git's POSIX shell (MSYS2 / Git Bash on Windows)
    let todo_posix = todo_file_path.to_string_lossy().replace('\\', "/");
    let editor_cmd = format!("cp -f \"{}\"", todo_posix);

    let mut cmd = silent_command("git");
    cmd.current_dir(workdir);
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    cmd.env("GIT_SEQUENCE_EDITOR", &editor_cmd);
    cmd.env("GIT_EDITOR", "true");
    cmd.arg("-c").arg(format!("sequence.editor={}", editor_cmd));
    cmd.arg("-c").arg("core.editor=true");
    cmd.arg("rebase").arg("-i").arg(onto_commit_id);

    let output_res = cmd.output();

    // Clean up temporary file
    let _ = fs::remove_file(&todo_file_path);

    let output = output_res.map_err(|e| AppError::Internal(format!("Lỗi thực thi git rebase -i: {e}")))?;

    if output.status.success() {
        let new_head = repo.head().ok().and_then(|h| h.target()).map(|t| t.to_string());
        return Ok(RebaseExecutionResult {
            status: "completed".to_string(),
            message: format!("Interactive Rebase lên '{}' hoàn tất thành công.", onto_commit_id),
            head_commit_id: new_head,
            conflicted_files: vec![],
        });
    }

    // Check if rebase encountered conflicts
    let conflicted = get_conflicted_files(repo)?;
    if !conflicted.is_empty() || is_rebasing(repo) {
        return Ok(RebaseExecutionResult {
            status: "conflict".to_string(),
            message: format!(
                "Rebase tạm dừng do xuất hiện xung đột tại {} tệp. Vui lòng giải quyết xung đột để tiếp tục.",
                conflicted.len()
            ),
            head_commit_id: None,
            conflicted_files: conflicted,
        });
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{}\n{}", stdout, stderr).trim().to_string();
    Err(AppError::GitMessage(format!("Interactive rebase thất bại: {combined}")))
}
