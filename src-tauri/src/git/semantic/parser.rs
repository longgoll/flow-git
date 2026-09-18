use std::path::Path;
use tree_sitter::{Language, Parser, Tree};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupportedLanguage {
    TypeScript,
    Tsx,
    JavaScript,
    Rust,
    Python,
}

impl SupportedLanguage {
    pub fn from_path(path: &str) -> Option<Self> {
        let ext = Path::new(path).extension()?.to_str()?.to_lowercase();
        match ext.as_str() {
            "ts" | "mts" | "cts" => Some(SupportedLanguage::TypeScript),
            "tsx" | "jsx" => Some(SupportedLanguage::Tsx),
            "js" | "mjs" | "cjs" => Some(SupportedLanguage::JavaScript),
            "rs" => Some(SupportedLanguage::Rust),
            "py" | "pyw" => Some(SupportedLanguage::Python),
            _ => None,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            SupportedLanguage::TypeScript => "typescript",
            SupportedLanguage::Tsx => "tsx",
            SupportedLanguage::JavaScript => "javascript",
            SupportedLanguage::Rust => "rust",
            SupportedLanguage::Python => "python",
        }
    }
}

pub fn get_language(lang: SupportedLanguage) -> Language {
    match lang {
        SupportedLanguage::TypeScript | SupportedLanguage::JavaScript => {
            tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into()
        }
        SupportedLanguage::Tsx => {
            tree_sitter_typescript::LANGUAGE_TSX.into()
        }
        SupportedLanguage::Rust => {
            tree_sitter_rust::LANGUAGE.into()
        }
        SupportedLanguage::Python => {
            tree_sitter_python::LANGUAGE.into()
        }
    }
}

pub fn create_parser(lang: SupportedLanguage) -> Option<Parser> {
    let mut parser = Parser::new();
    let language = get_language(lang);
    parser.set_language(&language).ok()?;
    Some(parser)
}

pub fn parse_code(code: &str, lang: SupportedLanguage) -> Option<Tree> {
    let mut parser = create_parser(lang)?;
    parser.parse(code, None)
}
