#!/usr/bin/env bash
# verify.sh - check an MP4 against expected codec / size / duration.
# Usage: verify.sh <file.mp4> [expected_width] [expected_height]
#                   <expected_duration_sec> [tolerance_sec]
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: verify.sh <file.mp4> <expected_width> <expected_height> <expected_duration_sec> [tolerance_sec]

Checks (one line per check, PASS/FAIL summary at the end):
  - file has a video stream
  - video codec is h264
  - width / height match the expected values (default: 1080 x 1920)
  - duration is within tolerance of the planned length from the brief (tolerance default: 0.15s)
  - reports whether an audio stream exists (informational, not a failure)

Exits non-zero if any required check fails.
EOF
}

# --- Args -------------------------------------------------------------------
case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac
if [[ $# -lt 4 || $# -gt 5 ]]; then
  echo "Error: wrong number of arguments." >&2
  usage >&2
  exit 2
fi

file="$1"
exp_w="${2:-1080}"
exp_h="${3:-1920}"
exp_dur="$4"
tol="${5:-0.15}"

# Validate numeric arguments.
num_re='^[0-9]+([.][0-9]+)?$'
int_re='^[0-9]+$'
if ! [[ "$exp_w" =~ $int_re && "$exp_h" =~ $int_re \
     && "$exp_dur" =~ $num_re && "$tol" =~ $num_re ]]; then
  echo "Error: expected width/height must be integers; duration/tolerance must be numbers." >&2
  usage >&2
  exit 2
fi

command -v ffprobe >/dev/null 2>&1 || { echo "✗ ffprobe not found in PATH" >&2; exit 2; }

fail=0
pass_line() { echo "✓ $1"; }
fail_line() { echo "✗ $1"; fail=1; }

# Workflow receipt: a project that uses Tasteframe cannot pass on codec alone.
guard_dir="$(cd "$(dirname "$file")" && pwd)"
while [[ "$guard_dir" != "/" ]]; do
  if [[ -f "$guard_dir/.tasteframe-state.json" ]]; then
    node "$(cd "$(dirname "$0")" && pwd)/guard.mjs" check-deliver --project "$guard_dir" || {
      echo "FAIL: $file"
      exit 1
    }
    break
  fi
  guard_dir="$(dirname "$guard_dir")"
done

# --- File existence -----------------------------------------------------------
if [[ ! -f "$file" ]]; then
  fail_line "file exists: '$file' not found"
  echo "FAIL: $file"
  exit 1
fi
pass_line "file exists: $file"

# --- Probe (each query tolerates failure so we can report all checks) --------
probe_stream() { # $1=stream selector, $2=entry
  ffprobe -v error -select_streams "$1" -show_entries stream="$2" \
    -of csv=p=0 "$file" 2>/dev/null | head -n 1 || true
}

codec="$(probe_stream v:0 codec_name)"
width="$(probe_stream v:0 width)"
height="$(probe_stream v:0 height)"
audio_codec="$(probe_stream a:0 codec_name)"
duration="$(ffprobe -v error -show_entries format=duration \
  -of csv=p=0 "$file" 2>/dev/null | head -n 1 || true)"

# --- Checks -------------------------------------------------------------------
if [[ -n "$codec" ]]; then
  pass_line "video stream present (codec: $codec)"
else
  fail_line "video stream present (none found)"
fi

if [[ "$codec" == "h264" ]]; then
  pass_line "video codec is h264"
else
  fail_line "video codec is h264 (got: ${codec:-none})"
fi

if [[ "$width" == "$exp_w" ]]; then
  pass_line "width is ${exp_w} (got: $width)"
else
  fail_line "width is ${exp_w} (got: ${width:-unknown})"
fi

if [[ "$height" == "$exp_h" ]]; then
  pass_line "height is ${exp_h} (got: $height)"
else
  fail_line "height is ${exp_h} (got: ${height:-unknown})"
fi

if [[ -n "$duration" ]] && awk -v d="$duration" -v e="$exp_dur" -v t="$tol" \
    'BEGIN { diff = d - e; if (diff < 0) diff = -diff; exit !(diff <= t) }'; then
  pass_line "duration within ${tol}s of ${exp_dur}s (got: ${duration}s)"
else
  fail_line "duration within ${tol}s of ${exp_dur}s (got: ${duration:-unknown}s)"
fi

# Audio is reported only, because silent renders are valid inputs for mix-vo.sh.
# On the final delivery file, run with REQUIRE_AUDIO=1 so a missing track fails.
if [[ -n "$audio_codec" ]]; then
  echo "✓ audio stream present (codec: $audio_codec)"
elif [[ "${REQUIRE_AUDIO:-0}" == "1" ]]; then
  fail_line "audio stream present (none found)"
else
  echo "✗ audio stream present (none found) [informational]"
fi
size_mb=$(( $(wc -c < "$file") / 1048576 ))
echo "• file size ${size_mb} MB"

# --- Verdict ------------------------------------------------------------------
if [[ "$fail" -eq 0 ]]; then
  echo "PASS: $file"
  exit 0
else
  echo "FAIL: $file"
  exit 1
fi
