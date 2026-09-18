#[cfg(test)]
mod tests {
    use crate::git::conflict::ConflictChunk;
    use crate::git::semantic::ast_node::SemanticConflictChunkKind;
    use crate::git::semantic::conflict_engine::{analyze_conflicts, auto_resolve_file_ast};
    use crate::git::semantic::diff_engine::compute_semantic_diff;
    use crate::git::semantic::parser::{parse_code, SupportedLanguage};

    #[test]
    fn test_tree_sitter_parse_rust() {
        let code = r#"
            fn add(a: i32, b: i32) -> i32 {
                a + b
            }
        "#;
        let tree = parse_code(code, SupportedLanguage::Rust);
        assert!(tree.is_some());
        assert!(!tree.unwrap().root_node().has_error());
    }

    #[test]
    fn test_tree_sitter_parse_typescript() {
        let code = r#"
            export function greet(name: string): string {
                return `Hello, ${name}`;
            }
        "#;
        let tree = parse_code(code, SupportedLanguage::TypeScript);
        assert!(tree.is_some());
        assert!(!tree.unwrap().root_node().has_error());
    }

    #[test]
    fn test_semantic_move_detection() {
        let old_code = r#"
function movedFunction() {
    console.log("I am moved");
    return 42;
}

function topFunction() {
    return 1;
}
"#;

        let new_code = r#"
function topFunction() {
    return 1;
}

// Some dummy comments or other code
// ...
// ...

function movedFunction() {
    console.log("I am moved");
    return 42;
}
"#;

        let diff = compute_semantic_diff("src/test.ts", Some(old_code), Some(new_code));
        assert!(diff.has_semantic_data);
        assert_eq!(diff.moves.len(), 1);
        assert_eq!(diff.moves[0].symbol_name, "movedFunction");
        assert!(diff.moves[0].is_identical);
    }

    #[test]
    fn test_ast_independent_additions_conflict_resolution() {
        let chunks = vec![
            ConflictChunk {
                chunk_index: 0,
                is_conflict: false,
                base_content: "".to_string(),
                our_content: "import { useState } from 'react';\n".to_string(),
                their_content: "import { useState } from 'react';\n".to_string(),
            },
            ConflictChunk {
                chunk_index: 1,
                is_conflict: true,
                base_content: "".to_string(),
                our_content: "function featureA() {\n    return 'A';\n}".to_string(),
                their_content: "function featureB() {\n    return 'B';\n}".to_string(),
            },
        ];

        let analysis = analyze_conflicts("src/app.ts", &chunks);
        assert_eq!(analysis.total_conflicts, 1);
        assert_eq!(analysis.ast_solvable_count, 1);
        assert_eq!(
            analysis.chunks[0].kind,
            SemanticConflictChunkKind::AstSolvableIndependentAddition
        );
        assert!(analysis.full_auto_resolvable);

        let resolve_result = auto_resolve_file_ast("src/app.ts", &chunks);
        assert!(resolve_result.success);
        assert!(resolve_result.syntax_valid);
        let content = resolve_result.resolved_content.unwrap();
        assert!(content.contains("featureA"));
        assert!(content.contains("featureB"));
    }

    #[test]
    fn test_ast_import_merge() {
        let chunks = vec![ConflictChunk {
            chunk_index: 0,
            is_conflict: true,
            base_content: "import { A } from 'pkg';\n".to_string(),
            our_content: "import { A } from 'pkg';\nimport { B } from 'pkg';\n".to_string(),
            their_content: "import { A } from 'pkg';\nimport { C } from 'pkg';\n".to_string(),
        }];

        let analysis = analyze_conflicts("src/index.ts", &chunks);
        assert_eq!(analysis.ast_solvable_count, 1);
        assert_eq!(
            analysis.chunks[0].kind,
            SemanticConflictChunkKind::AstSolvableImports
        );

        let resolve_result = auto_resolve_file_ast("src/index.ts", &chunks);
        assert!(resolve_result.success);
        assert!(resolve_result.syntax_valid);
        let content = resolve_result.resolved_content.unwrap();
        assert!(content.contains("import { B } from 'pkg';"));
        assert!(content.contains("import { C } from 'pkg';"));
    }
}
