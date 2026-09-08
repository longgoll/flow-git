mod common;

use common::setup_test_repo;
use flowgit_lib::git::stash_ops::{get_stash_detail, get_stash_file_diff, stash_branch};
use git2::{Signature, StashFlags};

#[test]
fn test_stash_detail_and_diff_integration() {
    let (dir, mut repo) = setup_test_repo();
    let file_path = dir.path().join("file1.txt");

    // Sửa đổi file1.txt trong working tree
    std::fs::write(&file_path, "Line 1\nLine 2 modified\nLine 3\nLine 4\n").expect("Failed to modify file");

    // Tạo stash
    let sig = Signature::now("FlowGit Tester", "tester@flowgit.local").expect("Signature error");
    let _oid = repo
        .stash_save2(&sig, Some("WIP feature test stash"), Some(StashFlags::DEFAULT))
        .expect("Failed to stash");

    // 1. Kiểm tra get_stash_detail
    let detail = get_stash_detail(&mut repo, 0).expect("Failed to get stash detail");
    assert_eq!(detail.index, 0);
    assert!(detail.message.contains("WIP feature test stash"));
    assert_eq!(detail.files.len(), 1);
    assert_eq!(detail.files[0].path, "file1.txt");
    assert_eq!(detail.files[0].status, "modified");
    assert!(detail.total_additions > 0);

    // 2. Kiểm tra get_stash_file_diff (Monaco Editor format)
    let diff = get_stash_file_diff(&mut repo, 0, "file1.txt", None).expect("Failed to get stash file diff");
    assert_eq!(diff.path, "file1.txt");
    assert!(!diff.hunks.is_empty(), "Hunks should not be empty");
    assert!(
        diff.modified_content.unwrap().contains("Line 2 modified"),
        "Modified content must match working tree stash"
    );
}

#[test]
fn test_stash_untracked_files_integration() {
    let (dir, mut repo) = setup_test_repo();

    // Tạo một tệp hoàn toàn mới chưa được track (untracked)
    let untracked_path = dir.path().join("untracked_file.txt");
    std::fs::write(&untracked_path, "Alpha line\nBeta line\n").expect("Failed to write untracked file");

    let sig = Signature::now("FlowGit Tester", "tester@flowgit.local").expect("Signature error");
    let _oid = repo
        .stash_save2(
            &sig,
            Some("Stash with untracked files"),
            Some(StashFlags::INCLUDE_UNTRACKED),
        )
        .expect("Failed to stash untracked files");

    // Kiểm tra stash detail ghi nhận đúng tệp untracked
    let detail = get_stash_detail(&mut repo, 0).expect("Failed to get stash detail");
    let untracked_item = detail.files.iter().find(|f| f.path == "untracked_file.txt");
    assert!(untracked_item.is_some(), "Untracked file must be recorded in stash detail");

    let untracked_item = untracked_item.unwrap();
    assert_eq!(untracked_item.status, "untracked");
    assert!(untracked_item.is_untracked);
    assert_eq!(untracked_item.additions, 2);

    // Kiểm tra diff của tệp untracked
    let diff = get_stash_file_diff(&mut repo, 0, "untracked_file.txt", None).expect("Failed to get diff");
    assert_eq!(diff.path, "untracked_file.txt");
    assert_eq!(diff.additions, 2);
    assert!(diff.modified_content.unwrap().contains("Alpha line"));
}

#[test]
fn test_stash_branch_workflow_integration() {
    let (dir, mut repo) = setup_test_repo();
    let file_path = dir.path().join("file1.txt");

    // Sửa đổi file để stash
    std::fs::write(&file_path, "Branch isolated work\n").expect("Failed to write file");

    let sig = Signature::now("FlowGit Tester", "tester@flowgit.local").expect("Signature error");
    repo.stash_save2(&sig, Some("Branch WIP Stash"), Some(StashFlags::DEFAULT))
        .expect("Failed to save stash");

    // Xác nhận stash đã có trong danh sách
    let mut count = 0;
    repo.stash_foreach(|_, _, _| {
        count += 1;
        true
    })
    .expect("Failed to list stashes");
    assert_eq!(count, 1);

    // Gọi lệnh stash_branch: tạo nhánh mới từ stash
    let branch_info = stash_branch(&mut repo, 0, "feature-from-stash").expect("Failed to execute stash_branch");
    assert_eq!(branch_info.shorthand, "feature-from-stash");
    assert!(branch_info.is_head);

    // Kiểm tra HEAD hiện tại trỏ đúng nhánh mới
    let head = repo.head().expect("Failed to get HEAD");
    assert_eq!(head.shorthand().unwrap(), "feature-from-stash");

    // Kiểm tra nội dung trong workdir đã được apply
    let content = std::fs::read_to_string(&file_path).expect("Failed to read file");
    assert_eq!(content, "Branch isolated work\n");

    // Kiểm tra stash đã được tự động xóa (drop) khỏi stack
    let mut count_after = 0;
    repo.stash_foreach(|_, _, _| {
        count_after += 1;
        true
    })
    .expect("Failed to check stashes");
    assert_eq!(count_after, 0, "Stash must be automatically dropped after branch created");
}

#[test]
fn test_stash_invalid_parameters_integration() {
    let (_dir, mut repo) = setup_test_repo();

    // 1. Tên nhánh rỗng hoặc toàn khoảng trắng
    let res = stash_branch(&mut repo, 0, "   ");
    assert!(res.is_err(), "Empty branch name must fail");

    // 2. Index stash vượt ngoài phạm vi
    let res = stash_branch(&mut repo, 9999, "valid-branch");
    assert!(res.is_err(), "Out-of-bounds stash index must fail");
}
