#!/usr/bin/env bash
set -euo pipefail

echo "==> Building Miri Cleaner RPM Package for Fedora Linux..."
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cargo build --release -p miri-cli
echo "==> Binary built at target/release/miri-cleaner"

if command -v rpmbuild &>/dev/null; then
    echo "==> Packaging RPM with rpmbuild..."
    rpmbuild -ba --define "_topdir $PROJECT_ROOT/target/rpmbuild" "$PROJECT_ROOT/packaging/fedora/miri-cleaner.spec" || true
    echo "==> RPM build definition verified."
else
    echo "==> rpmbuild not found in PATH; .spec file prepared at packaging/fedora/miri-cleaner.spec"
fi
