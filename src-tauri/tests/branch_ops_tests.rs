mod common;

use common::setup_test_repo;
use flowgit_lib::git::branches::{
    checkout_branch, create_branch, delete_branch, get_all_branches, rename_branch,
};

#[test]
fn test_create_and_checkout_branch_workflow() {
    let (_dir, repo) = setup_test_repo();

    // 1. Tạo nhánh mới không checkout
    create_branch(&repo, "feature-alpha", "HEAD", false).expect("Failed to create feature-alpha");

    let branches = get_all_branches(&repo).expect("Failed to list branches");
    let alpha = branches.iter().find(|b| b.shorthand == "feature-alpha");
    assert!(alpha.is_some(), "feature-alpha branch must exist");
    assert!(!alpha.unwrap().is_head, "feature-alpha should NOT be HEAD yet");

    // 2. Checkout sang nhánh feature-alpha
    checkout_branch(&repo, "feature-alpha").expect("Failed to checkout feature-alpha");
    let head = repo.head().unwrap();
    assert_eq!(head.shorthand().unwrap(), "feature-alpha");

    // 3. Tạo nhánh thứ 2 kèm cờ checkout = true
    create_branch(&repo, "feature-beta", "HEAD", true).expect("Failed to create feature-beta with checkout");
    let head_after = repo.head().unwrap();
    assert_eq!(head_after.shorthand().unwrap(), "feature-beta");
}

#[test]
fn test_branch_name_validation_rules() {
    let (_dir, repo) = setup_test_repo();

    // Tên rỗng
    assert!(create_branch(&repo, "", "HEAD", false).is_err());
    assert!(create_branch(&repo, "   ", "HEAD", false).is_err());

    // Tên chứa khoảng trắng
    assert!(create_branch(&repo, "my feature", "HEAD", false).is_err());

    // Tên chứa hai dấu chấm liên tiếp (..)
    assert!(create_branch(&repo, "feature..bug", "HEAD", false).is_err());

    // Tên bắt đầu bằng dấu gạch ngang (-)
    assert!(create_branch(&repo, "-invalid-start", "HEAD", false).is_err());
}

#[test]
fn test_rename_branch_integration() {
    let (_dir, repo) = setup_test_repo();

    create_branch(&repo, "old-name", "HEAD", false).expect("Failed to create old-name");
    rename_branch(&repo, "old-name", "new-cool-name").expect("Failed to rename branch");

    let branches = get_all_branches(&repo).expect("Failed to list branches");
    assert!(branches.iter().any(|b| b.shorthand == "new-cool-name"));
    assert!(!branches.iter().any(|b| b.shorthand == "old-name"));
}

#[test]
fn test_delete_branch_safety_checks() {
    let (_dir, repo) = setup_test_repo();

    // Tạo 2 nhánh: dev và temp
    create_branch(&repo, "dev", "HEAD", false).unwrap();
    create_branch(&repo, "temp-to-delete", "HEAD", false).unwrap();

    // Đang ở nhánh HEAD (ví dụ master/main): cố tình xóa chính HEAD phải thất bại
    let head_name = repo.head().unwrap().shorthand().unwrap().to_string();
    let res = delete_branch(&repo, &head_name, false);
    assert!(res.is_err(), "Must NOT allow deleting active HEAD branch");

    // Xóa nhánh không hoạt động (temp-to-delete) -> phải thành công
    let delete_res = delete_branch(&repo, "temp-to-delete", false);
    assert!(delete_res.is_ok(), "Deleting non-head branch should succeed");

    let branches_after = get_all_branches(&repo).unwrap();
    assert!(!branches_after.iter().any(|b| b.shorthand == "temp-to-delete"));
}
