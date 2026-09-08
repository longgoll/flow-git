mod common;

use common::{commit_file, setup_test_repo_with_trash};
use flowgit_lib::git::safety::{
    clear_trash_snapshots, discard_all_changes, discard_file_changes, get_reflog_entries,
    list_trash_snapshots, recover_reflog_target, restore_trash_snapshot, scan_staged_secrets,
};
use std::path::Path;

#[test]
fn test_safe_discard_and_restore_workflow() {
    let (dir, repo, store) = setup_test_repo_with_trash();
    let file_path = dir.path().join("file1.txt");

    // 1. Sửa đổi file1.txt nhưng chưa commit
    std::fs::write(&file_path, "Modified uncommitted change\nLine 2\n")
        .expect("Failed to write modified content");

    // 2. Gọi Safe Discard (hủy thay đổi an toàn)
    let snapshot_id = discard_file_changes(&repo, &store, "file1.txt")
        .expect("Failed to discard file changes safely");
    assert!(snapshot_id > 0, "Snapshot ID must be positive");

    // File trên đĩa phải được hoàn nguyên về bản commit gốc
    let content_after_discard = std::fs::read_to_string(&file_path)
        .expect("Failed to read file")
        .replace("\r\n", "\n");
    assert_eq!(content_after_discard, "Line 1\nLine 2\nLine 3\n");

    // 3. Kiểm tra Trash SQLite có ghi nhận snapshot
    let repo_path = repo.workdir().unwrap().to_string_lossy().to_string();
    let trash_items = list_trash_snapshots(&store, &repo_path).expect("Failed to list trash");
    assert_eq!(trash_items.len(), 1);
    assert_eq!(trash_items[0].file_path, "file1.txt");

    // 4. Phục hồi từ Thùng rác (Restore)
    restore_trash_snapshot(&repo, &store, snapshot_id).expect("Failed to restore from trash");

    // File trên đĩa phải phục hồi đúng nội dung sửa đổi trước khi xóa
    let restored_content = std::fs::read_to_string(&file_path)
        .expect("Failed to read file")
        .replace("\r\n", "\n");
    assert_eq!(restored_content, "Modified uncommitted change\nLine 2\n");

    // Thùng rác sau khi restore phải tự động dọn sạch snapshot đó
    let trash_after_restore = list_trash_snapshots(&store, &repo_path).expect("Failed to list trash");
    assert_eq!(trash_after_restore.len(), 0);
}

#[test]
fn test_discard_all_changes_and_clear_trash() {
    let (dir, repo, store) = setup_test_repo_with_trash();
    let file1 = dir.path().join("file1.txt");
    let file2 = dir.path().join("file2.txt");

    // Sửa file1 và tạo mới file2
    std::fs::write(&file1, "Change in file 1\n").unwrap();
    std::fs::write(&file2, "Brand new file 2\n").unwrap();

    // Discard toàn bộ thay đổi
    let discarded_count = discard_all_changes(&repo, &store).expect("Failed to discard all changes");
    assert!(discarded_count >= 1, "At least 1 change discarded");

    let repo_path = repo.workdir().unwrap().to_string_lossy().to_string();
    let trash_items = list_trash_snapshots(&store, &repo_path).expect("Failed to list trash");
    assert!(trash_items.len() >= 1);

    // Xóa sạch toàn bộ thùng rác
    let cleared_count = clear_trash_snapshots(&store, &repo_path).expect("Failed to clear trash");
    assert!(cleared_count >= 1);

    let trash_after_clear = list_trash_snapshots(&store, &repo_path).unwrap();
    assert_eq!(trash_after_clear.len(), 0);
}

#[test]
fn test_scan_staged_secrets_detection() {
    let (dir, repo, _store) = setup_test_repo_with_trash();

    // Tạo file chứa AWS Secret Key nhạy cảm
    let secret_file = dir.path().join("config.env");
    std::fs::write(
        &secret_file,
        "PORT=8080\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n",
    )
    .unwrap();

    // Stage file vào git index
    let mut index = repo.index().unwrap();
    index.add_path(Path::new("config.env")).unwrap();
    index.write().unwrap();

    // Quét phát hiện secret trước khi commit
    let findings = scan_staged_secrets(&repo).expect("Secret scanner failed");
    assert!(!findings.is_empty(), "Scanner must catch AWS secret key");

    let found_aws = findings.iter().any(|f| f.rule_id.contains("aws") || f.rule_name.contains("AWS"));
    assert!(found_aws, "Must specifically identify AWS secret key");
}

#[test]
fn test_reflog_time_travel_undo() {
    let (_dir, repo, _store) = setup_test_repo_with_trash();

    // Commit 1 (đã có từ setup)
    // Tạo thêm Commit 2
    let commit2_id = commit_file(&repo, "feature.txt", "Feature code v1\n", "Add feature v1");

    // Reset lùi HEAD về commit đầu tiên (giả lập thao tác vô tình làm mất commit 2)
    let head = repo.head().unwrap().peel_to_commit().unwrap();
    let parent = head.parent(0).expect("HEAD must have parent");
    repo.reset(parent.as_object(), git2::ResetType::Hard, None)
        .expect("Hard reset failed");

    // Kiểm tra Reflog để tìm lại commit bị mất (Orphaned / Lost commit)
    let reflog = get_reflog_entries(&repo, Some(20)).expect("Failed to get reflog");
    assert!(!reflog.is_empty(), "Reflog must have recorded events");

    // Cứu lại commit 2 bằng Time Machine: tạo nhánh mới 'rescued-feature' trỏ vào commit 2
    let branch_name = "rescued-feature";
    let rescued_msg = recover_reflog_target(&repo, &commit2_id.to_string(), Some(branch_name.to_string()))
        .expect("Failed to rescue lost commit via reflog");

    assert!(rescued_msg.contains(branch_name));

    // Xác nhận nhánh 'rescued-feature' đã được phục hồi đúng target commit 2
    let rescued_branch = repo.find_branch(branch_name, git2::BranchType::Local)
        .expect("Rescued branch must exist");
    assert_eq!(rescued_branch.get().target().unwrap(), commit2_id);
}
