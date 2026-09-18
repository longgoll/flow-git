use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tree_sitter::Node;

use crate::git::semantic::ast_node::{SemanticSymbol, SemanticSymbolKind};
use crate::git::semantic::parser::{parse_code, SupportedLanguage};

fn hash_content(s: &str) -> u64 {
    let normalized = s.split_whitespace().collect::<Vec<&str>>().join(" ");
    let mut hasher = DefaultHasher::new();
    normalized.hash(&mut hasher);
    hasher.finish()
}

pub fn extract_symbols(source: &str, lang: SupportedLanguage) -> Vec<SemanticSymbol> {
    let tree = match parse_code(source, lang) {
        Some(t) => t,
        None => return Vec::new(),
    };

    let root = tree.root_node();
    let mut symbols = Vec::new();
    let lines: Vec<&str> = source.lines().collect();

    extract_from_node(&root, source, &lines, lang, &mut symbols);
    symbols
}

fn extract_from_node(
    node: &Node,
    source: &str,
    lines: &[&str],
    lang: SupportedLanguage,
    symbols: &mut Vec<SemanticSymbol>,
) {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if let Some(symbol) = parse_symbol(&child, source, lines, lang) {
            symbols.push(symbol);
        } else {
            // For block containers like impl items or namespace/module, recurse
            let kind = child.kind();
            if kind == "impl_item" || kind == "module" || kind == "program" {
                extract_from_node(&child, source, lines, lang, symbols);
            }
        }
    }
}

fn parse_symbol(
    node: &Node,
    source: &str,
    lines: &[&str],
    lang: SupportedLanguage,
) -> Option<SemanticSymbol> {
    let kind_str = node.kind();
    let start_pos = node.start_position();
    let end_pos = node.end_position();
    let start_line = start_pos.row + 1;
    let end_line = end_pos.row + 1;

    let node_text = match node.utf8_text(source.as_bytes()) {
        Ok(t) => t,
        Err(_) => return None,
    };

    let first_line = lines.get(start_pos.row).unwrap_or(&"").trim().to_string();

    match lang {
        SupportedLanguage::TypeScript | SupportedLanguage::Tsx | SupportedLanguage::JavaScript => {
            match kind_str {
                "function_declaration" | "generator_function_declaration" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("fn:{}", name),
                        kind: SemanticSymbolKind::Function,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "class_declaration" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("class:{}", name),
                        kind: SemanticSymbolKind::Class,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "interface_declaration" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("interface:{}", name),
                        kind: SemanticSymbolKind::Interface,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "import_statement" => {
                    Some(SemanticSymbol {
                        id: format!("import:{}", start_line),
                        kind: SemanticSymbolKind::Import,
                        name: "import".to_string(),
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "export_statement" => {
                    // Try to look into inner declaration
                    if let Some(decl) = node.child_by_field_name("declaration") {
                        parse_symbol(&decl, source, lines, lang)
                    } else {
                        None
                    }
                }
                _ => None,
            }
        }
        SupportedLanguage::Rust => {
            match kind_str {
                "function_item" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("fn:{}", name),
                        kind: SemanticSymbolKind::Function,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "struct_item" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("struct:{}", name),
                        kind: SemanticSymbolKind::Struct,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "enum_item" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("enum:{}", name),
                        kind: SemanticSymbolKind::Enum,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "use_declaration" => {
                    Some(SemanticSymbol {
                        id: format!("use:{}", start_line),
                        kind: SemanticSymbolKind::Import,
                        name: "use".to_string(),
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                _ => None,
            }
        }
        SupportedLanguage::Python => {
            match kind_str {
                "function_definition" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("def:{}", name),
                        kind: SemanticSymbolKind::Function,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "class_definition" => {
                    let name = node
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                        .unwrap_or("anonymous")
                        .to_string();
                    Some(SemanticSymbol {
                        id: format!("class:{}", name),
                        kind: SemanticSymbolKind::Class,
                        name,
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                "import_statement" | "import_from_statement" => {
                    Some(SemanticSymbol {
                        id: format!("import:{}", start_line),
                        kind: SemanticSymbolKind::Import,
                        name: "import".to_string(),
                        signature: first_line,
                        start_line,
                        end_line,
                        body_hash: hash_content(node_text),
                        raw_content: node_text.to_string(),
                    })
                }
                _ => None,
            }
        }
    }
}
