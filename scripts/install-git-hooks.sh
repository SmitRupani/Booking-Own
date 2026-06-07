#!/usr/bin/env sh
# Installs a git hooks path to .githooks inside the repo and makes pre-push run a build.
set -eu
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.githooks"

mkdir -p "$HOOKS_DIR"
cat > "$HOOKS_DIR/pre-push" <<'HOOK'
#!/usr/bin/env sh
# pre-push hook: run a production build and fail push if it fails
echo "Running npm run build to validate production build before push..."
if ! npm run build --silent; then
  echo "\nERROR: 'npm run build' failed. Aborting push. Fix build errors before pushing." >&2
  exit 1
fi
HOOK

chmod +x "$HOOKS_DIR/pre-push"

# Configure git to use this hooks directory
if git rev-parse --git-dir >/dev/null 2>&1; then
  git config core.hooksPath "$HOOKS_DIR"
  echo "Installed git hooks to $HOOKS_DIR and configured core.hooksPath"
else
  echo "Not a git repository — please run this script from the repository root."
fi
