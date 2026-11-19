# Agent instructions

## Git and remote actions

- Do not act autonomously on anything that changes remote or shared state.
  Always ask for explicit approval first.
- Never run `git add`, `git commit`, `git commit --amend`, `git push`,
  `git reset`, `git rebase`, `git tag`, or any other command that stages,
  commits, rewrites, or publishes history unless the user explicitly asks for
  it in the current request.
- Never deploy or publish without explicit approval, including Vercel
  deployments, app-store uploads, EAS builds/submits, and remote database
  migrations or configuration changes.
- Read-only commands (`git status`, `git diff`, `git log`, `git show`, build
  status checks) are allowed.
- Leave changes in the working tree by default. Do not commit or deploy to
  "clean up" before a build or tooling step.
- If a build, deploy, or tool requires a commit or another remote action, stop
  and ask the user for permission.
- When the user explicitly asks to commit, stage only the files relevant to
  that request. Do not push or deploy unless the same request explicitly asks
  for it.
- Never amend a commit or force-push without explicit approval.
