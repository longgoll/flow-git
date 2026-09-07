# Privacy Policy for FlowGit

**Last Updated:** September 7, 2026

FlowGit ("we", "our", or "the Application") is an open-source visual Git client built with Rust and Tauri v2. We are committed to respecting and protecting your privacy. This Privacy Policy explains our practices regarding the collection, storage, and handling of information when you use FlowGit.

---

## 1. Zero Telemetry & Local-First Architecture

FlowGit is designed with a **local-first, privacy-by-default** philosophy:

- **No Personal Data Collection:** We do not collect, track, store, or sell any personal information, usage analytics, device identifiers, or tracking telemetry.
- **No Background Surveillance:** The application does not monitor your keystrokes, personal files, or general system activities.
- **Local Git Operations:** All Git operations (commits, branches, stashes, diffs, reflogs) are executed entirely on your local machine using the native `libgit2` engine and local file system. Your source code and repository data never leave your computer unless you explicitly choose to push to a remote repository.

---

## 2. Information Handled by FlowGit

FlowGit only accesses data that is strictly necessary to perform the actions you explicitly request:

### A. Local Git Repositories
- FlowGit reads and writes to repository folders that you deliberately open.
- FlowGit stores temporary staging snapshots (Safe Discard feature) and operation history (Undo log) in a local SQLite database on your device (`~/.flowgit` or app data folder). This data remains strictly on your local disk and is never sent to external servers.

### B. Git Credentials & Authentication
- When interacting with remote repositories (e.g., GitHub, GitLab, Bitbucket), authentication tokens or SSH keys provided by you are handled using standard Git credential helpers or stored securely in your system's local credential storage / SQLite vault.
- Credentials are never transmitted to FlowGit developers or third parties.

### C. Optional Third-Party Integrations
- **GitHub Integration:** If you choose to connect your GitHub account (for listing repositories or pull requests), requests are made directly between your computer and GitHub's official API (`api.github.com`).
- **Local AI Features (Optional):** If you enable AI commit assistance or conflict explanation, requests are sent to your local LLM (such as Ollama) or your self-configured API endpoint. No code snippets or commit data are sent to any FlowGit-hosted AI servers.

---

## 3. Network Connections

The application only initiates network connections in the following explicit scenarios:
1. **User-Initiated Git Remote Commands:** When you execute `fetch`, `pull`, `push`, or `clone` to communicate with your designated Git remotes.
2. **Software Updates:** FlowGit may query our official GitHub Releases endpoint (`https://github.com/longgoll/flow-git/releases/latest`) to check for newer versions and download cryptographic signatures. No personal identifiers are transmitted during update checks.

---

## 4. Children's Privacy

FlowGit is a developer utility and does not knowingly collect or solicit any personal information from children under the age of 13.

---

## 5. Third-Party Services

When you push code or interact with remote hosting providers (e.g., GitHub, GitLab), your interactions are governed by the privacy policies of those respective third-party services:
- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)
- [Microsoft Privacy Statement](https://privacy.microsoft.com/en-us/privacystatement)

---

## 6. Open Source Transparency

FlowGit is open source under the MIT License. Anyone can audit the complete source code to verify our privacy and security commitments at:
[https://github.com/longgoll/flow-git](https://github.com/longgoll/flow-git)

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in FlowGit features or legal requirements. Any updates will be posted to this document with a revised "Last Updated" date.

---

## 8. Contact Information

If you have any questions, feedback, or concerns regarding this Privacy Policy or FlowGit's security practices, please contact us via:

- **GitHub Issues:** [https://github.com/longgoll/flow-git/issues](https://github.com/longgoll/flow-git/issues)
- **Repository:** [https://github.com/longgoll/flow-git](https://github.com/longgoll/flow-git)
