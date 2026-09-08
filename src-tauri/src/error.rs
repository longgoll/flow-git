use serde::Serialize;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug)]
pub enum AppError {
    Git(git2::Error),
    GitMessage(String),
    Io(std::io::Error),
    NotFound(String),
    InvalidRepo(String),
    Database(rusqlite::Error),
    Internal(String),
}

impl From<git2::Error> for AppError {
    fn from(err: git2::Error) -> Self {
        AppError::Git(err)
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err)
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err)
    }
}

fn format_git_error(err: &git2::Error) -> String {
    let raw_msg = err.message();
    match err.code() {
        git2::ErrorCode::Locked => {
            format!("Kho lưu trữ đang bị khóa bởi tiến trình Git khác (.git/index.lock). Vui lòng đợi hoặc thử lại.")
        }
        git2::ErrorCode::Conflict => {
            format!("Có xung đột tệp tin chưa được giải quyết ({raw_msg})")
        }
        git2::ErrorCode::NotFound => {
            format!("Không tìm thấy đối tượng Git, nhánh hoặc commit được yêu cầu ({raw_msg})")
        }
        git2::ErrorCode::Exists => {
            format!("Tên nhánh, tag hoặc tham chiếu này đã tồn tại ({raw_msg})")
        }
        git2::ErrorCode::Auth => {
            format!("Xác thực Git thất bại. Vui lòng kiểm tra tài khoản, SSH Key hoặc Personal Access Token ({raw_msg})")
        }
        git2::ErrorCode::Unmerged => {
            format!("Còn thay đổi chưa hoàn tất quá trình merge ({raw_msg})")
        }
        git2::ErrorCode::BareRepo => {
            format!("Thao tác không được hỗ trợ trên bare repository ({raw_msg})")
        }
        _ => {
            if raw_msg.contains("index.lock") {
                format!("Kho lưu trữ đang bị khóa (.git/index.lock). Vui lòng đợi hoặc xóa file lock nếu tiến trình trước bị crash.")
            } else {
                format!("Lỗi Git: {raw_msg}")
            }
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Git(e) => write!(f, "{}", format_git_error(e)),
            AppError::GitMessage(msg) => write!(f, "Git: {msg}"),
            AppError::Io(e) => write!(f, "Lỗi I/O hệ thống: {e}"),
            AppError::NotFound(msg) => write!(f, "Không tìm thấy: {msg}"),
            AppError::InvalidRepo(msg) => write!(f, "Kho lưu trữ không hợp lệ: {msg}"),
            AppError::Database(e) => write!(f, "Lỗi cơ sở dữ liệu: {e}"),
            AppError::Internal(msg) => write!(f, "Lỗi nội bộ: {msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

