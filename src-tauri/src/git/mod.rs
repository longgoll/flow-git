pub mod auth;
pub mod bisect;
pub mod blame;
pub mod branches;
pub mod commit_ops;
pub mod comparison;
pub mod conflict;
pub mod diff;
pub mod edge_cases;
pub mod focus;
pub mod history;
pub mod identity;
pub mod ignore;
pub mod interactive_rebase;
pub mod lfs;
pub mod rebase;
pub mod remote_ops;
pub mod repo;
pub mod safety;
pub mod simulation;
pub mod stacked;
pub mod status;
pub mod submodule;
pub mod sync;
pub mod tree;
pub mod worktree;
pub mod stash_ops;

use serde::{Deserialize, Serialize};

pub use auth::{AccountProfile, DeviceCodeResponse, DevicePollResult, GitCredentials, RemoteActionResult};
pub use bisect::BisectStatus;
pub use blame::{BlameHunkItem, FileHistoryItem};
pub use conflict::{ConflictChunk, ConflictFileDetail};
pub use edge_cases::{HeavyFileInfo, LockedFileInfo};
pub use history::PaginatedCommitHistory;
pub use identity::{CurrentRepoIdentity, GitIdentity};
pub use interactive_rebase::RebaseTodoItem;
pub use lfs::{LfsFileInfo, LfsLockInfo, LfsSummary};
pub use rebase::RebaseExecutionResult;
pub use remote_ops::RemoteInfo;
pub use stash_ops::{StashDetail, StashFileItem};
pub use submodule::SubmoduleInfo;
pub use tree::{FileContentResponse, FileGrepMatch, TreeEntryItem};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefInfo {
    pub name: String,
    pub shorthand: String,
    pub ref_type: RefType,
    pub is_head: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RefType {
    LocalBranch,
    RemoteBranch,
    Tag,
    Stash,
    Head,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitNode {
    pub id: String,
    pub short_id: String,
    pub parents: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    pub summary: String,
    pub timestamp: i64,
    pub lane: usize,
    pub refs: Vec<RefInfo>,
    #[serde(default)]
    pub is_trunk: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchInfo {
    pub name: String,
    pub shorthand: String,
    pub is_remote: bool,
    pub is_head: bool,
    pub target_commit_id: String,
    pub upstream_name: Option<String>,
    pub ahead_count: usize,
    pub behind_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagInfo {
    pub name: String,
    pub target_commit_id: String,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StashInfo {
    pub index: usize,
    pub message: String,
    pub commit_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoSummary {
    pub path: String,
    pub name: String,
    pub is_bare: bool,
    pub current_branch: Option<String>,
    pub head_commit_id: Option<String>,
    pub is_detached: bool,
    pub dirty_files_count: usize,
    pub staged_files_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitDetail {
    pub id: String,
    pub short_id: String,
    pub parents: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    pub author_timestamp: i64,
    pub committer_name: String,
    pub committer_email: String,
    pub committer_timestamp: i64,
    pub message: String,
    pub files_changed: Vec<FileChangeInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangeInfo {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String, // "added", "modified", "deleted", "renamed"
    pub additions: usize,
    pub deletions: usize,
}
