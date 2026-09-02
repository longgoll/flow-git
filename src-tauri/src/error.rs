use serde::Serialize;
use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),

    #[error("Git message: {0}")]
    GitMessage(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Repository not found at: {0}")]
    NotFound(String),

    #[error("Invalid repository: {0}")]
    InvalidRepo(String),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
