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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileGrepMatch {
    pub file_path: String,
    pub line_number: usize,
    pub line_content: String,
}

pub fn save_file_content(
    repo: &Repository,
    file_path: &str,
    content: &str,
) -> AppResult<()> {
    let clean_path = file_path.trim_matches(&['/', '\\'][..]);
    let workdir = repo.workdir().ok_or_else(|| AppError::Internal("No workdir in bare repo".into()))?;
    let full_path = workdir.join(clean_path);

    if let Some(parent) = full_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }

    std::fs::write(&full_path, content.as_bytes()).map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

pub fn grep_repository_content(
    repo: &Repository,
    query: &str,
    case_sensitive: bool,
    max_results: usize,
) -> AppResult<Vec<FileGrepMatch>> {
    let workdir = repo.workdir().ok_or_else(|| AppError::Internal("No workdir in bare repo".into()))?;
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let query_str = if case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };

    let mut files_to_search = Vec::new();
    collect_search_files(workdir, workdir, &mut files_to_search, 1500);

    use rayon::prelude::*;
    let results: Vec<FileGrepMatch> = files_to_search
        .into_par_iter()
        .flat_map(|rel_path| {
            let full_path = workdir.join(&rel_path);
            let mut matches = Vec::new();
            if let Ok(bytes) = std::fs::read(&full_path) {
                let check_len = bytes.len().min(512);
                if !bytes[..check_len].contains(&0) {
                    if let Ok(content) = std::str::from_utf8(&bytes) {
                        for (idx, line) in content.lines().enumerate() {
                            let matches_line = if case_sensitive {
                                line.contains(&query_str)
                            } else {
                                line.to_lowercase().contains(&query_str)
                            };
                            if matches_line {
                                matches.push(FileGrepMatch {
                                    file_path: rel_path.clone(),
                                    line_number: idx + 1,
                                    line_content: line.trim_end().chars().take(200).collect(),
                                });
                            }
                        }
                    }
                }
            }
            matches
        })
        .collect();

    let mut truncated = results;
    if truncated.len() > max_results {
        truncated.truncate(max_results);
    }
    Ok(truncated)
}

fn collect_search_files(
    root: &std::path::Path,
    dir: &std::path::Path,
    files: &mut Vec<String>,
    max_files: usize,
) {
    if files.len() >= max_files {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if files.len() >= max_files {
                return;
            }
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name == ".git"
                || name == "node_modules"
                || name == "target"
                || name == "dist"
                || name == ".svelte-kit"
                || name == "build"
            {
                continue;
            }
            if path.is_dir() {
                collect_search_files(root, &path, files, max_files);
            } else if path.is_file() {
                if let Ok(rel) = path.strip_prefix(root) {
                    let rel_str = rel.to_string_lossy().replace('\\', "/");
                    files.push(rel_str);
                }
            }
        }
    }
}

pub fn open_file_in_editor(full_path: &str, editor: Option<&str>) -> AppResult<()> {
    let p = std::path::Path::new(full_path);
    if !p.exists() {
        return Err(AppError::NotFound(format!("File does not exist: {}", full_path)));
    }

    let target_editor = editor.unwrap_or("default");
    match target_editor {
        "cursor" => {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("cmd")
                    .args(["/c", "cursor", full_path])
                    .spawn();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("cursor").arg(full_path).spawn();
            }
            Ok(())
        }
        "code" => {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("cmd")
                    .args(["/c", "code", full_path])
                    .spawn();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("code").arg(full_path).spawn();
            }
            Ok(())
        }
        "antigravity" | "agy" => {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("cmd")
                    .args(["/c", "agy", full_path])
                    .spawn();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("agy").arg(full_path).spawn();
            }
            Ok(())
        }
        "zed" => {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("cmd")
                    .args(["/c", "zed", full_path])
                    .spawn();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("zed").arg(full_path).spawn();
            }
            Ok(())
        }
        _ => {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("cmd")
                    .args(["/c", "start", "", full_path])
                    .spawn();
            }
            #[cfg(target_os = "macos")]
            {
                let _ = std::process::Command::new("open").arg(full_path).spawn();
            }
            #[cfg(target_os = "linux")]
            {
                let _ = std::process::Command::new("xdg-open").arg(full_path).spawn();
            }
            Ok(())
        }
    }
}

pub fn reveal_in_file_manager(full_path: &str) -> AppResult<()> {
    let p = std::path::Path::new(full_path);
    if !p.exists() {
        return Err(AppError::NotFound(format!("File does not exist: {}", full_path)));
    }

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .args(["/select,", full_path])
            .spawn();
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").args(["-R", full_path]).spawn();
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let parent = p.parent().unwrap_or(p);
        let _ = std::process::Command::new("xdg-open").arg(parent).spawn();
        Ok(())
    }
}
