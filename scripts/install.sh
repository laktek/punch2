#!/bin/sh

set -e

echo "Installing Punch..."

if [ "$OS" = "Windows_NT" ]; then
	target="x86_64-pc-windows-msvc"
else
	case $(uname -sm) in
	"Darwin x86_64") target="x86_64-apple-darwin" ;;
	"Darwin arm64") target="aarch64-apple-darwin" ;;
	"Linux aarch64") target="aarch64-unknown-linux-gnu" ;;
	*) target="x86_64-unknown-linux-gnu" ;;
	esac
fi

if [ $# -eq 0 ]; then
	punch_uri="https://github.com/laktek/punch2/releases/latest/download/punch-${target}"
else
	punch_uri="https://github.com/laktek/punch2/releases/download/${1}/punch-${target}"
fi

punch_install="${PUNCH_INSTALL:-$HOME/.punch}"
bin_dir="$punch_install/bin"
exe="$bin_dir/punch"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe" "$punch_uri"
chmod +x "$exe"

echo "Punch was installed successfully to $exe"
if command -v punch >/dev/null; then
	echo "Run 'punch --help' to get started"
else
	case $SHELL in
	/bin/zsh) shell_profile=".zshrc" ;;
	*) shell_profile=".bashrc" ;;
	esac
	echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
	echo "  export PUNCH_INSTALL=\"$punch_install\""
	echo "  export PATH=\"\$PUNCH_INSTALL/bin:\$PATH\""
	echo "Run '$exe --help' to get started"
fi
echo
echo "Need help? visit https://punch.dev/docs"
