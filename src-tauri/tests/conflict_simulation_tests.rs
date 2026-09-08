mod common;

use common::{commit_file, setup_test_repo};
use flowgit_lib::git::simulation::simulate_merge_or_rebase;

#[test]
fn test_clean_merge_dry_run_simulation() {
    let (_dir, repo) = setup_test_repo();

    // Commit 1: base (đã có từ setup_test_repo với file1.txt)
    let base_commit = repo.head().unwrap().peel_to_commit().unwrap();

    // Nhánh main: thêm file_main.txt
    let main_commit_id = commit_file(&repo, "file_main.txt", "Content from main\n", "Commit on main");

    // Tạo nhánh feature từ base_commit
    repo.branch("feature", &base_commit, false).expect("Failed to create feature branch");
    repo.set_head("refs/heads/feature").expect("Failed to switch to feature");
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force();
    repo.checkout_head(Some(&mut checkout_opts)).expect("Failed checkout feature");

    // Nhánh feature: thêm file_feature.txt (không trùng lặp với file_main.txt)
    let feature_commit_id = commit_file(&repo, "file_feature.txt", "Content from feature\n", "Commit on feature");

    // Chạy mô phỏng in-memory merge giữa feature và main
    let sim_result = simulate_merge_or_rebase(
        &repo,
        &feature_commit_id.to_string(),
        &main_commit_id.to_string(),
    )
    .expect("Dry run simulation failed");

    // Không có xung đột
    assert!(!sim_result.has_conflicts, "Should not have conflicts on clean merge");
    assert!(sim_result.conflict_files.is_empty());
}

#[test]
fn test_conflicting_merge_dry_run_simulation() {
    let (_dir, repo) = setup_test_repo();

    // Base commit
    let base_commit = repo.head().unwrap().peel_to_commit().unwrap();

    // Nhánh main: sửa dòng 2 thành "Line 2 modified by MAIN"
    let main_commit_id = commit_file(
        &repo,
        "file1.txt",
        "Line 1\nLine 2 modified by MAIN\nLine 3\n",
        "Change line 2 on main",
    );

    // Tạo nhánh feature từ base commit
    repo.branch("feature-conflict", &base_commit, false).expect("Branch error");
    repo.set_head("refs/heads/feature-conflict").expect("Set head error");
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force();
    repo.checkout_head(Some(&mut checkout_opts)).expect("Checkout error");

    // Nhánh feature: cũng sửa dòng 2 thành "Line 2 modified by FEATURE" -> Gây conflict!
    let feature_commit_id = commit_file(
        &repo,
        "file1.txt",
        "Line 1\nLine 2 modified by FEATURE\nLine 3\n",
        "Change line 2 on feature",
    );

    // Mô phỏng merge in-memory (Dry-Run)
    let sim_result = simulate_merge_or_rebase(
        &repo,
        &feature_commit_id.to_string(),
        &main_commit_id.to_string(),
    )
    .expect("Dry run simulation failed");

    // Phải phát hiện ra conflict
    assert!(sim_result.has_conflicts, "Simulation MUST detect conflict");
    assert_eq!(sim_result.conflict_files.len(), 1);
    assert_eq!(sim_result.conflict_files[0], "file1.txt");

    // Quan trọng: Working directory phải được bảo vệ nguyên vẹn, không bị vấy bẩn bởi conflict markers
    let workdir_content = std::fs::read_to_string(repo.workdir().unwrap().join("file1.txt")).unwrap();
    assert!(
        !workdir_content.contains("<<<<<<<"),
        "Dry-run simulation must never pollute the working tree with conflict markers"
    );
}
