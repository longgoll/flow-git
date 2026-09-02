use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use crate::error::{AppError, AppResult};

/// Thêm một pattern cụ thể vào .gitignore ở thư mục gốc của repository
pub fn add_pattern_to_gitignore(repo_path: &str, pattern: &str) -> AppResult<()> {
    let clean_pattern = pattern.trim().trim_end_matches('/');
    if clean_pattern.is_empty() {
        return Ok(());
    }

    let root_path = Path::new(repo_path);
    let gitignore_path = root_path.join(".gitignore");

    let mut existing_lines: Vec<String> = Vec::new();
    if gitignore_path.exists() {
        let content = fs::read_to_string(&gitignore_path).map_err(|e| {
            AppError::Internal(format!("Không thể đọc .gitignore: {}", e))
        })?;
        existing_lines = content.lines().map(|s| s.trim().to_string()).collect();
    }

    // Kiểm tra xem pattern đã tồn tại chưa (chấp nhận cả có hoặc không có dấu / ở cuối)
    let pattern_with_slash = format!("{}/", clean_pattern);
    let already_exists = existing_lines.iter().any(|line| {
        line == clean_pattern || line == &pattern_with_slash
    });

    if !already_exists {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&gitignore_path)
            .map_err(|e| AppError::Internal(format!("Không thể mở/tạo .gitignore: {}", e)))?;

        // Nếu file có nội dung và không kết thúc bằng newline, thêm newline trước
        if gitignore_path.metadata().map(|m| m.len() > 0).unwrap_or(false) {
            let last_content = fs::read_to_string(&gitignore_path).unwrap_or_default();
            if !last_content.ends_with('\n') {
                writeln!(file).ok();
            }
        }

        writeln!(file, "{}", pattern).map_err(|e| {
            AppError::Internal(format!("Không thể ghi vào .gitignore: {}", e))
        })?;
    }

    Ok(())
}

/// Tự động phát hiện stack công nghệ và tạo / bổ sung các quy tắc chuẩn vào .gitignore
pub fn generate_smart_gitignore(repo_path: &str) -> AppResult<Vec<String>> {
    let root = Path::new(repo_path);
    let mut patterns_to_add: Vec<String> = Vec::new();

    // 1. Phổ biến cho mọi hệ điều hành & editor
    patterns_to_add.push("# OS & Editor files".to_string());
    patterns_to_add.push(".DS_Store".to_string());
    patterns_to_add.push("Thumbs.db".to_string());
    patterns_to_add.push(".idea/".to_string());
    patterns_to_add.push(".vscode/*".to_string());
    patterns_to_add.push("!.vscode/settings.json".to_string());
    patterns_to_add.push("!.vscode/extensions.json".to_string());
    patterns_to_add.push("*.log".to_string());

    // 2. Node.js / Web stack
    if root.join("package.json").exists() || root.join("node_modules").exists() {
        patterns_to_add.push("".to_string());
        patterns_to_add.push("# Node.js dependencies & builds".to_string());
        patterns_to_add.push("node_modules/".to_string());
        patterns_to_add.push("dist/".to_string());
        patterns_to_add.push(".svelte-kit/".to_string());
        patterns_to_add.push(".next/".to_string());
        patterns_to_add.push(".nuxt/".to_string());
        patterns_to_add.push(".turbo/".to_string());
        patterns_to_add.push(".vite/".to_string());
        patterns_to_add.push(".env".to_string());
        patterns_to_add.push(".env.local".to_string());
    }

    // 3. Rust stack
    if root.join("Cargo.toml").exists() || root.join("src-tauri/Cargo.toml").exists() {
        patterns_to_add.push("".to_string());
        patterns_to_add.push("# Rust & Tauri builds".to_string());
        patterns_to_add.push("target/".to_string());
        patterns_to_add.push("src-tauri/target/".to_string());
        patterns_to_add.push("*.rs.bk".to_string());
    }

    // 4. Python stack
    if root.join("requirements.txt").exists() || root.join("pyproject.toml").exists() {
        patterns_to_add.push("".to_string());
        patterns_to_add.push("# Python".to_string());
        patterns_to_add.push("__pycache__/".to_string());
        patterns_to_add.push("*.py[cod]".to_string());
        patterns_to_add.push(".venv/".to_string());
        patterns_to_add.push("venv/".to_string());
        patterns_to_add.push("env/".to_string());
    }

    let gitignore_path = root.join(".gitignore");
    let mut existing_content = String::new();
    if gitignore_path.exists() {
        existing_content = fs::read_to_string(&gitignore_path).unwrap_or_default();
    }

    let existing_lines: Vec<&str> = existing_content.lines().map(|s| s.trim()).collect();
    let mut appended_rules = Vec::new();

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&gitignore_path)
        .map_err(|e| AppError::Internal(format!("Không thể mở .gitignore: {}", e)))?;

    if !existing_content.is_empty() && !existing_content.ends_with('\n') {
        writeln!(file).ok();
    }

    for pattern in patterns_to_add {
        if pattern.starts_with('#') || pattern.is_empty() {
            // Header hoặc dòng trống
            writeln!(file, "{}", pattern).ok();
        } else {
            let clean = pattern.trim_end_matches('/');
            let with_slash = format!("{}/", clean);
            if !existing_lines.contains(&clean) && !existing_lines.contains(&with_slash.as_str()) {
                writeln!(file, "{}", pattern).map_err(|e| {
                    AppError::Internal(format!("Không thể ghi rule {}: {}", pattern, e))
                })?;
                appended_rules.push(pattern);
            }
        }
    }

    Ok(appended_rules)
}
