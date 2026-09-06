Name:           miri-cleaner
Version:        0.1.0
Release:        1%{?dist}
Summary:        (•◡•) Sparkling Clean & Ultra-Safe System Maintenance Suite for Fedora & Linux

License:        MIT OR Apache-2.0
URL:            https://github.com/miri-cleaner/miri-cleaner
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  rust
BuildRequires:  cargo
BuildRequires:  nodejs
BuildRequires:  npm
BuildRequires:  gtk3-devel
BuildRequires:  pkg-config

Requires:       polkit
Requires:       systemd

%description
Miri Cleaner pairs a cheerful, Duolingo-inspired interface with a memory-safe
Rust core engine, verifiable dry-run calculations, process lock detection, and
strict privilege separation. Automatically integrates with Snapper / Timeshift
for pre-cleanup snapshots and safely optimizes DNF5 package caches, systemd
journal databases, and developer toolchains.

%prep
%autosetup

%build
cargo build --release -p miri-cli
cd packages/miri-gui && npm install && npm run build

%install
rm -rf %{buildroot}
install -d %{buildroot}%{_bindir}
install -d %{buildroot}%{_datadir}/applications
install -d %{buildroot}%{_datadir}/polkit-1/actions

# Install CLI & TUI binary
install -m 755 target/release/miri-cleaner %{buildroot}%{_bindir}/miri-cleaner

# Install Polkit Policy for zero-trust elevation
install -m 644 packaging/fedora/org.freedesktop.miri-cleaner.policy %{buildroot}%{_datadir}/polkit-1/actions/

# Install Desktop Entry
install -m 644 packaging/fedora/miri-cleaner.desktop %{buildroot}%{_datadir}/applications/

%files
%{_bindir}/miri-cleaner
%{_datadir}/polkit-1/actions/org.freedesktop.miri-cleaner.policy
%{_datadir}/applications/miri-cleaner.desktop

%changelog
* Sun Sep 06 2026 Miri Cleaner Team <info@miri-cleaner.org> - 0.1.0-1
- Initial Fedora RPM release with Btrfs snapshot verification and Polkit integration.
