use std::path::Path;
use git2::{build::CheckoutBuilder, Repository};
use crate::error::{AppError, AppResult};
use crate::git::diff::get_working_tree_file_diff;
use crate::git::status::get_working_tree_status;
use crate::storage::trash::{TrashSnapshotItem, TrashStore};

pub fn discard_file_changes(
    repo: &Repository,
    store: &TrashStore,
    file_path: &str,
) -> AppResult<()> {
    let repo_path = repo
        .workdir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| repo.path().to_string_lossy().to_string());

    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::Internal("No workdir in bare repository".into()))?;

    let full_path = workdir.join(file_path);

    let head_sha = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .map(|t| t.to_string());

    // 1. Read current disk content and generate diff preview for safe snapshot
    let (content, diff_preview) = if full_path.exists() && full_path.is_file() {
        let raw = std::fs::read(&full_path).unwrap_or_default();
        let diff_detail = get_working_tree_file_diff(repo, file_path, false, None).ok();
        let preview = if let Some(d) = diff_detail {
            let mut buf = String::new();
            for h in &d.hunks {
                buf.push_str(&h.header);
                buf.push('\n');
                for l in &h.lines {
                    match l.line_type {
                        crate::git::diff::LineChangeType::Addition => buf.push('+'),
                        crate::git::diff::LineChangeType::Deletion => buf.push('-'),
                        crate::git::diff::LineChangeType::Context => buf.push(' '),
                    }
                    buf.push_str(&l.content);
                    buf.push('\n');
                }
            }
            if buf.is_empty() {
                format!("Raw content ({} bytes)", raw.len())
            } else {
                buf
            }
        } else {
            format!("Raw content ({} bytes)", raw.len())
        };
        (raw, preview)
    } else {
        // File was deleted in workdir
        (Vec::new(), format!("Deleted file: {file_path}"))
    };

    // 2. Save snapshot in SQLite Trash Store BEFORE discarding
    let _ = store.save_snapshot(
        &repo_path,
        file_path,
        &content,
        &diff_preview,
        head_sha.as_deref(),
    )?;

    // 3. Perform discard
    let mut index = repo.index()?;
    let in_index = index.get_path(Path::new(file_path), 0).is_some();

    if in_index {
        let mut builder = CheckoutBuilder::new();
        builder.force();
        builder.path(file_path);
        repo.checkout_index(Some(&mut index), Some(&mut builder))?;
    } else if full_path.exists() {
        // Untracked file: safely remove
        let _ = std::fs::remove_file(&full_path);
    }

    Ok(())
}

pub fn discard_all_changes(repo: &Repository, store: &TrashStore) -> AppResult<usize> {
    let status = get_working_tree_status(repo)?;
    let mut count = 0;

    for item in status.unstaged.iter().chain(status.untracked.iter()) {
        if let Ok(()) = discard_file_changes(repo, store, &item.path) {
            count += 1;
        }
    }

    Ok(count)
}

pub fn restore_trash_snapshot(
    repo: &Repository,
    store: &TrashStore,
    snapshot_id: i64,
) -> AppResult<()> {
    let (_repo_path, file_path, content) = store.get_snapshot_content(snapshot_id)?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::Internal("No workdir in bare repository".into()))?;

    let full_path = workdir.join(&file_path);

    if let Some(parent) = full_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    std::fs::write(&full_path, content)
        .map_err(|e| AppError::Internal(format!("Failed to restore file {file_path}: {e}")))?;

    Ok(())
}

pub fn list_trash_snapshots(
    store: &TrashStore,
    repo_path: &str,
) -> AppResult<Vec<TrashSnapshotItem>> {
    store.list_snapshots(repo_path)
}

pub fn delete_trash_snapshot(store: &TrashStore, snapshot_id: i64) -> AppResult<()> {
    store.delete_snapshot(snapshot_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use git2::Signature;

    #[test]
    fn test_safe_discard_and_restore() {
        let dir = tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();
        let db_file = dir.path().join("trash_test.db");
        let store = TrashStore::new(&db_file).unwrap();

        // 1. Initial commit
        let file_path = dir.path().join("hello.txt");
        std::fs::write(&file_path, "Initial line\n").unwrap();

        let sig = Signature::now("Tester", "test@flowgit.local").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("hello.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[]).unwrap();

        // 2. Modify file in workdir
        std::fs::write(&file_path, "Modified line\nExtra line\n").unwrap();

        // 3. Discard file changes
        discard_file_changes(&repo, &store, "hello.txt").unwrap();

        // File on disk should be back to initial content
        let content_after = std::fs::read_to_string(&file_path).unwrap().replace("\r\n", "\n");
        assert_eq!(content_after, "Initial line\n");

        // 4. Check TrashStore
        let repo_path = repo.workdir().unwrap().to_string_lossy().to_string();
        let trash_items = list_trash_snapshots(&store, &repo_path).unwrap();
        assert_eq!(trash_items.len(), 1);
        assert_eq!(trash_items[0].file_path, "hello.txt");

        // 5. Restore from trash
        restore_trash_snapshot(&repo, &store, trash_items[0].id).unwrap();
        let content_restored = std::fs::read_to_string(&file_path).unwrap().replace("\r\n", "\n");
        assert_eq!(content_restored, "Modified line\nExtra line\n");
    }
}
