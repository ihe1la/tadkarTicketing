# Overlay instructions for the old `tadkar-rebuild`

Do not upload or recreate `node_modules` or `.pnpm-store`.

Recommended steps:

```powershell
cd D:\codexAI\tadkar-rebuild

New-Item -ItemType Directory -Force .\_archive\old-plan | Out-Null

Copy-Item .\AGENTS.md .\_archive\old-plan\AGENTS.md -ErrorAction SilentlyContinue
Copy-Item .\CODEX.md .\_archive\old-plan\CODEX.md -ErrorAction SilentlyContinue
Copy-Item .\PLANS.md .\_archive\old-plan\PLANS.md -ErrorAction SilentlyContinue
Copy-Item .\START_HERE.md .\_archive\old-plan\START_HERE.md -ErrorAction SilentlyContinue

# Extract this V2 pack into the repository root after backup.
```

Do not delete existing application code before Codex audits it.
