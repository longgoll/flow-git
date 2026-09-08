mod common;

use common::{commit_file, setup_test_repo};
use flowgit_lib::storage::action_log::ActionLogStore;

#[test]
fn test_action_log_and_undo_head_restoration() {
    let (dir, repo) = setup_test_repo();
    let db_path = dir.path().join("test_actions.db");
    let store = ActionLogStore::new(&db_path).expect("Failed to init ActionLogStore");

    let repo_path = repo.workdir().unwrap().to_string_lossy().to_string();

    // Commit ban đầu
    let commit1_id = repo.head().unwrap().target().unwrap().to_string();

    // Tạo Commit thứ 2
    let commit2_id = commit_file(&repo, "feature.txt", "Feature code\n", "Commit 2").to_string();

    // Ghi nhận hành động vào ActionLogStore
    store
        .record_action(
            &repo_path,
            "commit",
            "Created Commit 2",
            &commit1_id,
            &commit2_id,
            Some("main"),
            "safe",
        )
        .expect("Failed to record action");

    // Kiểm tra danh sách hành động
    let actions = store.list_actions(&repo_path, 10).expect("Failed to list actions");
    assert_eq!(actions.len(), 1);
    assert_eq!(actions[0].action_type, "commit");
    assert_eq!(actions[0].previous_head, commit1_id);
    assert_eq!(actions[0].new_head, commit2_id);
    assert!(!actions[0].is_undone);

    // Thực hiện Undo hành động (Ctrl + Z)
    let undone_record = store.undo_action(&repo).expect("Undo action failed");
    assert_eq!(undone_record.id, actions[0].id);
    assert!(undone_record.is_undone);

    // Kiểm tra HEAD hiện tại đã quay trở lại commit1_id
    let current_head = repo.head().unwrap().target().unwrap().to_string();
    assert_eq!(
        current_head, commit1_id,
        "Undo must restore HEAD to previous_head commit"
    );

    // Kiểm tra trong database: hành động đã được đánh dấu is_undone = true
    let updated_actions = store.list_actions(&repo_path, 10).unwrap();
    assert!(updated_actions[0].is_undone);
}
