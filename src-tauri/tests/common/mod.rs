#![allow(dead_code)]

use git2::{Repository, Signature};
use std::path::Path;
use tempfile::tempdir;

/// Tạo một Git Repository tạm thời hoàn toàn độc lập phục vụ cho Integration Tests
pub fn setup_test_repo() -> (tempfile::TempDir, Repository) {
    let dir = tempdir().expect("Failed to create temporary directory for test");
    let repo = Repository::init(dir.path()).expect("Failed to initialize test git repo");

    // Tạo commit ban đầu (Initial commit)
    let file_path = dir.path().join("file1.txt");
    std::fs::write(&file_path, "Line 1\nLine 2\nLine 3\n").expect("Failed to write initial test file");

    let sig = Signature::now("FlowGit Tester", "tester@flowgit.local").expect("Failed to create signature");
    let mut index = repo.index().expect("Failed to get repo index");
    index.add_path(Path::new("file1.txt")).expect("Failed to add file to index");
    index.write().expect("Failed to write index");
    let tree_id = index.write_tree().expect("Failed to write index tree");
    {
        let tree = repo.find_tree(tree_id).expect("Failed to find tree");
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
            .expect("Failed to create initial commit");
    }

    (dir, repo)
}

/// Tạo commit mới với nội dung file chỉ định
pub fn commit_file(repo: &Repository, relative_path: &str, content: &str, message: &str) -> git2::Oid {
    let workdir = repo.workdir().expect("Repository has no workdir");
    let file_path = workdir.join(relative_path);
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create parent dirs");
    }
    std::fs::write(&file_path, content).expect("Failed to write file for commit");

    let sig = Signature::now("FlowGit Tester", "tester@flowgit.local").expect("Signature error");
    let mut index = repo.index().expect("Index error");
    index.add_path(Path::new(relative_path)).expect("Add path error");
    index.write().expect("Failed to write index");
    let tree_id = index.write_tree().expect("Write tree error");
    let tree = repo.find_tree(tree_id).expect("Find tree error");

    let head_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = match head_commit {
        Some(ref c) => vec![c],
        None => vec![],
    };

    repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)
        .expect("Failed to commit")
}

/// Tạo Git repo tạm kèm TrashStore SQLite độc lập trong thư mục tạm
pub fn setup_test_repo_with_trash() -> (tempfile::TempDir, Repository, flowgit_lib::storage::trash::TrashStore) {
    let (dir, repo) = setup_test_repo();
    let db_path = dir.path().join("test_trash.db");
    let store = flowgit_lib::storage::trash::TrashStore::new(&db_path).expect("Failed to init test trash store");
    (dir, repo, store)
}

