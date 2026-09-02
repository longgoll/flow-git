use std::path::Path;
use git2::{ObjectType, Oid, Repository};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeEntryItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContentResponse {
    pub path: String,
    pub content: String,
    pub is_binary: bool,
    pub size_bytes: usize,
}

pub fn get_tree_entries(
    repo: &Repository,
    dir_path: Option<&str>,
    commit_oid: Option<&str>,
) -> AppResult<Vec<TreeEntryItem>> {
    let clean_dir = dir_path.map(|p| p.trim_matches(&['/', '\\'][..])).filter(|p| !p.is_empty());

    if let Some(oid_str) = commit_oid {
        let oid = Oid::from_str(oid_str).map_err(|e| AppError::Internal(e.to_string()))?;
        let commit = repo.find_commit(oid)?;
        let root_tree = commit.tree()?;

        let target_tree = if let Some(subpath) = clean_dir {
            let entry = root_tree.get_path(Path::new(subpath))?;
            entry.to_object(repo)?.peel_to_tree()?
        } else {
            root_tree
        };

        let mut items = Vec::new();
        for entry in target_tree.iter() {
            let name = entry.name().unwrap_or("").to_string();
            let is_dir = entry.kind() == Some(ObjectType::Tree);
            let full_path = match clean_dir {
                Some(parent) => format!("{}/{}", parent, name),
                None => name.clone(),
            };

            let size = if !is_dir {
                entry.to_object(repo).ok().and_then(|obj| {
                    obj.peel_to_blob().ok().map(|b| b.size() as u64)
                })
            } else {
                None
            };

            items.push(TreeEntryItem {
                name,
                path: full_path,
                is_dir,
                size,
            });
        }

        // Sort: directories first, then alphabetical
        items.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        Ok(items)
    } else {
        // Working directory tree
        let workdir = repo.workdir().ok_or_else(|| AppError::Internal("No workdir in bare repo".into()))?;
        let target_dir = match clean_dir {
            Some(sub) => workdir.join(sub),
            None => workdir.to_path_buf(),
        };

        if !target_dir.exists() || !target_dir.is_dir() {
            return Ok(Vec::new());
        }

        let read_dir = std::fs::read_dir(&target_dir).map_err(|e| AppError::Internal(e.to_string()))?;
        let mut items = Vec::new();

        for entry in read_dir.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name == ".git" {
                continue;
            }

            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };

            let is_dir = file_type.is_dir();
            let full_path = match clean_dir {
                Some(parent) => format!("{}/{}", parent, file_name),
                None => file_name.clone(),
            };

            let size = if !is_dir {
                entry.metadata().ok().map(|m| m.len())
            } else {
                None
            };

            items.push(TreeEntryItem {
                name: file_name,
                path: full_path,
                is_dir,
                size,
            });
        }

        items.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        Ok(items)
    }
}

pub fn get_file_content(
    repo: &Repository,
    file_path: &str,
    commit_oid: Option<&str>,
) -> AppResult<FileContentResponse> {
    let clean_path = file_path.trim_matches(&['/', '\\'][..]);

    if let Some(oid_str) = commit_oid {
        let oid = Oid::from_str(oid_str).map_err(|e| AppError::Internal(e.to_string()))?;
        let commit = repo.find_commit(oid)?;
        let tree = commit.tree()?;
        let entry = tree.get_path(Path::new(clean_path))?;
        let blob = entry.to_object(repo)?.peel_to_blob()?;

        let content_bytes = blob.content();
        let size_bytes = content_bytes.len();
        let is_binary = content_bytes.contains(&0);

        let content = if is_binary {
            String::new()
        } else {
            String::from_utf8_lossy(content_bytes).to_string()
        };

        Ok(FileContentResponse {
            path: clean_path.to_string(),
            content,
            is_binary,
            size_bytes,
        })
    } else {
        let workdir = repo.workdir().ok_or_else(|| AppError::Internal("No workdir in bare repo".into()))?;
        let full_path = workdir.join(clean_path);

        if !full_path.exists() {
            return Err(AppError::NotFound(format!("File not found: {}", clean_path)));
        }

        let content_bytes = std::fs::read(&full_path).map_err(|e| AppError::Internal(e.to_string()))?;
        let size_bytes = content_bytes.len();
        let is_binary = content_bytes.contains(&0);

        let content = if is_binary {
            String::new()
        } else {
            String::from_utf8_lossy(&content_bytes).to_string()
        };

        Ok(FileContentResponse {
            path: clean_path.to_string(),
            content,
            is_binary,
            size_bytes,
        })
    }
}
