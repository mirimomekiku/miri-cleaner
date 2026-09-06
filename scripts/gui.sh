#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Ensure core binary is compiled
if [ ! -f "target/release/miri-cleaner" ]; then
    echo "==> Compiling Miri Cleaner Rust core engine..."
    cargo build --release -p miri-cli
fi

cd "$DIR/packages/miri-gui"
if [ ! -d "node_modules" ]; then
    echo "==> Installing frontend dependencies..."
    npm install
fi

# Rebuild UI assets if dist is missing or source code has been updated
NEEDS_BUILD=false
if [ ! -f "dist/index.html" ]; then
    NEEDS_BUILD=true
elif [ -n "$(find src -newer dist/index.html 2>/dev/null | head -n 1)" ]; then
    NEEDS_BUILD=true
fi

for arg in "$@"; do
    if [ "$arg" = "--build" ] || [ "$arg" = "-b" ]; then
        NEEDS_BUILD=true
    fi
done

if [ "$NEEDS_BUILD" = true ]; then
    echo "==> Building latest UI assets with relative base..."
    npm run build
fi

echo "==> Launching Miri Cleaner Desktop Application Window..."
exec npx electron electron/main.cjs "$@"
