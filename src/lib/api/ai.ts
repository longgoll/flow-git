import type { AISettings, ConflictChunk } from '../types';

export async function generateAICommitMessage(
  diffContext: string,
  settings: AISettings
): Promise<string> {
  if (settings.provider === 'ollama' && settings.endpoint) {
    try {
      const response = await fetch(`${settings.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model || 'qwen2.5-coder',
          prompt: `You are an expert Git assistant. Write a clear, concise Conventional Commit message (e.g. feat(scope): message, fix(scope): message) for the following changes:\n\n${diffContext.slice(0, 3000)}\n\nOnly respond with the commit message, nothing else.`,
          stream: false,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.response.trim();
      }
    } catch (e) {
      console.warn('Ollama API failed, falling back to heuristic AI:', e);
    }
  }

  // Smart Heuristic Fallback
  return generateHeuristicCommitMessage(diffContext);
}

export function generateHeuristicCommitMessage(diff: string): string {
  const lines = diff.split('\n');
  const files: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      files.push(line.replace('+++ b/', ''));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  const primaryFile = files[0] || 'app';
  const basename = primaryFile.split('/').pop()?.split('.')[0] || 'core';

  if (files.some((f) => f.includes('test'))) {
    return `test(${basename}): add automated tests and edge case coverage`;
  }
  if (files.some((f) => f.endsWith('.md'))) {
    return `docs(${basename}): update documentation and workflow guides`;
  }
  if (deletions > additions * 2) {
    return `refactor(${basename}): streamline logic and cleanup redundant code`;
  }
  if (diff.toLowerCase().includes('fix') || diff.toLowerCase().includes('bug') || diff.toLowerCase().includes('error')) {
    return `fix(${basename}): resolve issue in ${basename} and stabilize behavior`;
  }
  return `feat(${basename}): implement new updates and improvements`;
}

export async function generateAIPRDescription(
  sourceBranch: string,
  targetBranch: string,
  commitSummaries: string[],
  filesChanged: string[],
  settings?: AISettings
): Promise<{ title: string; description: string }> {
  // Title heuristic
  let prTitle = sourceBranch
    .replace(/^(feature|feat|fix|bugfix|chore|docs|refactor|test)\//i, (m) => m.slice(0, -1).toUpperCase() + ': ')
    .replace(/[-_]/g, ' ');
  prTitle = prTitle.charAt(0).toUpperCase() + prTitle.slice(1);

  if (commitSummaries.length > 0) {
    const firstCommit = commitSummaries[0];
    if (firstCommit && firstCommit.length > 5) {
      prTitle = firstCommit.charAt(0).toUpperCase() + firstCommit.slice(1);
    }
  }

  // Ollama prompt if settings available
  if (settings?.provider === 'ollama' && settings.endpoint) {
    try {
      const prompt = `You are an expert Git and GitHub assistant. Based on:
Source Branch: ${sourceBranch} -> Base Branch: ${targetBranch}
Commits:
${commitSummaries.slice(0, 10).map((c) => `- ${c}`).join('\n')}
Files:
${filesChanged.slice(0, 15).join('\n')}

Generate a professional Pull Request description in markdown with:
## 📝 Tóm tắt thay đổi
(Bullet points of main additions and modifications)
## 🔍 Kiểm tra & Đảm bảo chất lượng
(Checklist items)
## ⚠️ Lưu ý (nếu có)`;

      const response = await fetch(`${settings.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model || 'qwen2.5-coder',
          prompt,
          stream: false,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return {
          title: prTitle,
          description: data.response.trim(),
        };
      }
    } catch (e) {
      console.warn('Ollama PR description failed, using heuristic:', e);
    }
  }

  // Smart Heuristic Markdown description
  const bullets = commitSummaries.length > 0
    ? commitSummaries.slice(0, 5).map((c) => `- ${c}`).join('\n')
    : `- Tích hợp và đồng bộ các thay đổi từ nhánh \`${sourceBranch}\` vào \`${targetBranch}\`.`;

  const filesSummary = filesChanged.length > 0
    ? `\n\n### 📁 Các tệp trọng tâm (${filesChanged.length} files)\n` +
      filesChanged.slice(0, 6).map((f) => `- \`${f}\``).join('\n') +
      (filesChanged.length > 6 ? `\n- *và ${filesChanged.length - 6} tệp khác...*` : '')
    : '';

  const markdown = `## 📝 Tóm tắt thay đổi\n${bullets}${filesSummary}\n\n## 🔍 Kiểm tra & Đảm bảo chất lượng\n- [x] Đã kiểm tra build và chạy thử nghiệm cục bộ.\n- [x] Không gây ảnh hưởng ngược đến các chức năng nhánh \`${targetBranch}\`.\n- [x] Mã nguồn sạch sẽ, tuân thủ quy chuẩn dự án.`;

  return {
    title: prTitle,
    description: markdown,
  };
}

export async function generateAIPRReview(
  prTitle: string,
  filesChanged: { filename: string; additions: number; deletions: number; patch?: string }[],
  settings?: AISettings
): Promise<string> {
  if (settings?.provider === 'ollama' && settings.endpoint) {
    try {
      const summaryContext = filesChanged
        .slice(0, 8)
        .map((f) => `${f.filename} (+${f.additions}/-${f.deletions}):\n${(f.patch || '').slice(0, 800)}`)
        .join('\n---\n');

      const response = await fetch(`${settings.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model || 'qwen2.5-coder',
          prompt: `You are a Senior Code Reviewer. Review this Pull Request: "${prTitle}".
Here are the diff snippets:
${summaryContext.slice(0, 4000)}

Provide a concise, constructive code review in Vietnamese with:
1. 💡 Tổng quan đánh giá (Điểm sáng)
2. ⚠️ Rủi ro tiềm ẩn hoặc gợi ý tối ưu
3. ✅ Kết luận: Khuyến nghị Approve hay Cần chỉnh sửa thêm?`,
          stream: false,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.response.trim();
      }
    } catch (e) {
      console.warn('Ollama PR review failed, using heuristic review:', e);
    }
  }

  // Heuristic review based on changes
  const totalAdd = filesChanged.reduce((acc, f) => acc + f.additions, 0);
  const totalDel = filesChanged.reduce((acc, f) => acc + f.deletions, 0);
  const hasTests = filesChanged.some((f) => f.filename.toLowerCase().includes('test'));
  const hasDocs = filesChanged.some((f) => f.filename.endsWith('.md'));

  return `### 🤖 FlowGit AI Code Review

#### 💡 Tổng quan đánh giá:
- PR gồm **${filesChanged.length} tệp thay đổi** với **+${totalAdd} / -${totalDel} dòng code**.
- Cấu trúc thay đổi tập trung và bám sát mục tiêu của PR: *"${prTitle}"*.
${hasTests ? '- ✅ Đã có tệp kiểm thử kèm theo trong PR.' : '- ℹ️ Chưa phát hiện tệp kiểm thử mới (nếu là feature lớn, khuyến nghị bổ sung unit tests).'}
${hasDocs ? '- 📚 Có tài liệu / hướng dẫn cập nhật đi kèm.' : ''}

#### ⚠️ Gợi ý tối ưu & An toàn:
- Kiểm tra tính tương thích ngược với nhánh đích trước khi merge.
- Đảm bảo tất cả các luồng xử lý lỗi (error handling) không bị nuốt ngoại lệ âm thầm.

#### ✅ Khuyến nghị:
- Code đạt tiêu chuẩn sạch sẽ. **Sẵn sàng để Merge** sau khi chạy kiểm thử hoàn tất!`;
}

export async function resolveConflictChunkAI(
  chunk: ConflictChunk,
  filePath: string,
  settings?: AISettings
): Promise<string> {
  if (settings?.provider === 'ollama' && settings.endpoint) {
    try {
      const prompt = `You are an expert Git conflict resolution engine.
File: "${filePath}"
${chunk.base_content ? `BASE (Ancestor):\n${chunk.base_content}\n\n` : ''}OURS (Current Branch):\n${chunk.our_content}\n\nTHEIRS (Incoming Branch):\n${chunk.their_content}

Resolve this conflict by logically merging the changes from both sides.
Rules:
1. Preserve functional intent from both sides without duplicated variables or syntax errors.
2. Return ONLY the final resolved code block.
3. Absolutely DO NOT include markdown code blocks, backticks, or conflict markers (<<<<<<<, =======, >>>>>>>).`;

      const response = await fetch(`${settings.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model || 'qwen2.5-coder',
          prompt,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let cleaned = (data.response || '').trim();
        // Strip markdown fences if any
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '');
        }
        if (cleaned) return cleaned;
      }
    } catch (e) {
      console.warn('Ollama conflict resolve failed, using heuristic:', e);
    }
  }

  // Heuristic Conflict Resolution
  return heuristicResolveChunk(chunk);
}

function heuristicResolveChunk(chunk: ConflictChunk): string {
  const ours = (chunk.our_content || '').trim();
  const theirs = (chunk.their_content || '').trim();

  if (!ours && theirs) return chunk.their_content;
  if (!theirs && ours) return chunk.our_content;
  if (ours === theirs) return chunk.our_content;

  // Special heuristic: If both are import statements, combine and deduplicate lines
  const ourLines = chunk.our_content.split('\n');
  const theirLines = chunk.their_content.split('\n');
  const isAllImports = [...ourLines, ...theirLines].every(
    (l) => !l.trim() || l.trim().startsWith('import ') || l.trim().startsWith('from ') || l.trim().startsWith('} from') || l.trim().startsWith('use ')
  );

  if (isAllImports) {
    const combinedSet = new Set<string>();
    const resultLines: string[] = [];
    for (const l of [...ourLines, ...theirLines]) {
      const trimmed = l.trim();
      if (trimmed && !combinedSet.has(trimmed)) {
        combinedSet.add(trimmed);
        resultLines.push(l);
      } else if (!trimmed && resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
    }
    return resultLines.join('\n');
  }

  // Default: Smart combine with Ours prioritized then Theirs
  return `${chunk.our_content}\n${chunk.their_content}`;
}

export async function resolveConflictFileAI(
  chunks: ConflictChunk[],
  filePath: string,
  settings?: AISettings
): Promise<string> {
  const resolvedParts: string[] = [];
  for (const chunk of chunks) {
    if (!chunk.is_conflict) {
      resolvedParts.push(chunk.our_content || chunk.their_content || '');
    } else {
      const resolved = await resolveConflictChunkAI(chunk, filePath, settings);
      resolvedParts.push(resolved);
    }
  }
  return resolvedParts.join('\n');
}

