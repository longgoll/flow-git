mod common;

use common::{commit_file, setup_test_repo};
use flowgit_lib::git::history::get_topological_history;

#[test]
fn test_linear_history_routes_to_lane_zero() {
    let (_dir, repo) = setup_test_repo();

    // Tạo 3 commit liên tiếp tuyến tính trên nhánh chính (Trunk)
    commit_file(&repo, "file1.txt", "Line 1\nUpdate A\n", "Commit A");
    commit_file(&repo, "file1.txt", "Line 1\nUpdate B\n", "Commit B");
    commit_file(&repo, "file1.txt", "Line 1\nUpdate C\n", "Commit C");

    let history = get_topological_history(&repo, 50).expect("Failed to get history");
    assert!(history.len() >= 4); // 1 initial + 3 commits

    // Toàn bộ commit trên trunk phải được phân bổ vào Lane 0 (Metro Backbone)
    for node in &history {
        assert_eq!(
            node.lane, 0,
            "Linear trunk commit '{}' must be in Lane 0, but got Lane {}",
            node.summary, node.lane
        );
    }
}

#[test]
fn test_branching_and_merge_graph_lanes() {
    let (_dir, repo) = setup_test_repo();
    let base_commit = repo.head().unwrap().peel_to_commit().unwrap();

    // Commit 1 trên trunk
    commit_file(&repo, "trunk.txt", "Trunk v1\n", "Trunk commit 1");

    // Tạo nhánh feature từ base_commit
    repo.branch("feature-graph", &base_commit, false).unwrap();
    repo.set_head("refs/heads/feature-graph").unwrap();
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force();
    repo.checkout_head(Some(&mut checkout_opts)).unwrap();

    // Tạo commit trên feature
    let feature_commit_id = commit_file(&repo, "feature.txt", "Feature code\n", "Feature branch commit");

    // Quay lại nhánh main/master
    repo.set_head("refs/heads/master").or_else(|_| repo.set_head("refs/heads/main")).unwrap();
    repo.checkout_head(Some(&mut checkout_opts)).unwrap();

    // Thêm commit nữa trên main
    commit_file(&repo, "trunk.txt", "Trunk v2\n", "Trunk commit 2");

    // Lấy đồ thị lịch sử
    let history = get_topological_history(&repo, 50).expect("Failed to get graph history");

    // Tìm node của feature commit
    let feature_node = history
        .iter()
        .find(|n| n.id == feature_commit_id.to_string())
        .expect("Feature commit must be present in history");

    // Commit của feature tách nhánh phải có Lane >= 1 (không đè lên Lane 0 của Trunk)
    assert!(
        feature_node.lane >= 1,
        "Branch commit should be assigned to Lane >= 1, but got {}",
        feature_node.lane
    );
}

#[test]
fn test_topological_order_guarantee() {
    let (_dir, repo) = setup_test_repo();

    let c1 = commit_file(&repo, "f.txt", "1", "First");
    let c2 = commit_file(&repo, "f.txt", "2", "Second");
    let c3 = commit_file(&repo, "f.txt", "3", "Third");

    let history = get_topological_history(&repo, 10).unwrap();

    let pos_c3 = history.iter().position(|n| n.id == c3.to_string()).unwrap();
    let pos_c2 = history.iter().position(|n| n.id == c2.to_string()).unwrap();
    let pos_c1 = history.iter().position(|n| n.id == c1.to_string()).unwrap();

    // Đồ thị topological hiển thị commit mới nhất ở trên cùng: c3 < c2 < c1
    assert!(pos_c3 < pos_c2, "Commit 3 must appear before Commit 2 in graph");
    assert!(pos_c2 < pos_c1, "Commit 2 must appear before Commit 1 in graph");
}
