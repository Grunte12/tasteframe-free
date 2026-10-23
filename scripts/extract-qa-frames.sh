#!/usr/bin/env bash
# extract-qa-frames.sh - extract one PNG frame per timestamp for QA.
# Usage: extract-qa-frames.sh <file.mp4> <outdir> [time1 time2 ...]
# With no times, defaults to the beat boundaries of a 15s clip.
# Output files are named frame_<time>s.png ('.' in the time becomes 'p').
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: extract-qa-frames.sh <file.mp4> <outdir> [time1 time2 ...]

  file.mp4   Input video
  outdir     Output directory (created if needed)
  timeN      Timestamps in seconds, decimals allowed (e.g. 0.5 3 12.75)

With no timestamps, defaults to the beat boundaries of a 15s clip:
  0.5 2.9 5 9 13 14.5

Example:
  extract-qa-frames.sh final.mp4 qa-frames/ 0.5 2.9 5 9 13 14.5
EOF
}

# --- Args -------------------------------------------------------------------
case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac
if [[ $# -lt 2 ]]; then
  echo "Error: expected at least <file.mp4> and <outdir>." >&2
  usage >&2
  exit 2
fi

file="$1"
outdir="$2"
shift 2

[[ -f "$file" ]] || { echo "✗ input file not found: $file" >&2; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "✗ ffmpeg not found in PATH" >&2; exit 2; }

# Default beat boundaries for a 15s clip when no times were given.
times=("$@")
if [[ ${#times[@]} -eq 0 ]]; then
  times=(0.5 2.9 5 9 13 14.5)
fi

mkdir -p "$outdir"

# --- Extract ------------------------------------------------------------------
num_re='^[0-9]+([.][0-9]+)?$'
fail=0

for t in "${times[@]}"; do
  if ! [[ "$t" =~ $num_re ]]; then
    echo "✗ timestamp is not a number: '$t'" >&2
    fail=1
    continue
  fi
  # Sanitize '.' -> 'p' so 2.9 becomes frame_2p9s.png.
  safe="${t//./p}"
  out="${outdir%/}/frame_${safe}s.png"
  # -ss before -i = fast (keyframe) seek, fine for QA stills.
  # ffmpeg can exit 0 but write nothing for a seek past EOF, so the
  # output file itself is checked, not just the exit code.
  rm -f "$out"
  if ffmpeg -y -v error -ss "$t" -i "$file" -frames:v 1 "$out" \
     && [[ -s "$out" ]]; then
    echo "$out"
  else
    rm -f "$out"
    echo "✗ failed to extract frame at ${t}s" >&2
    fail=1
  fi
done

if [[ "$fail" -eq 0 ]]; then
  echo "PASS: extracted ${#times[@]} frame(s) from $file into $outdir"
else
  echo "FAIL: one or more frames could not be extracted from $file" >&2
  exit 1
fi
