#!/usr/bin/env bash
set -u

API_URL="${RAPIDA_CALL_API_URL:-http://localhost:9007/v1/talk/create-phone-call}"
API_KEY="${RAPIDA_API_KEY:-e4da0463dfddcca57c8f4432a64fb6540f3669513f26379d8f1ac9a791e1d11e}"
ASSISTANT_ID="${RAPIDA_ASSISTANT_ID:-2341188802971697152}"
FROM_NUMBER="${RAPIDA_FROM_NUMBER:-5002}"
TO_NUMBER="${RAPIDA_TO_NUMBER:-5001}"
CALLS_PER_SECOND="${RAPIDA_CALLS_PER_SECOND:-5}"
DURATION_SECONDS="${RAPIDA_DURATION_SECONDS:-4}"
COUNT="${RAPIDA_CALL_COUNT:-$((CALLS_PER_SECOND * DURATION_SECONDS))}"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${TMPDIR:-/tmp}/rapida-call-cps-run-${RUN_ID}"

if ! [[ "$CALLS_PER_SECOND" =~ ^[1-9][0-9]*$ ]]; then
  echo "RAPIDA_CALLS_PER_SECOND must be a positive integer, got: ${CALLS_PER_SECOND}" >&2
  exit 1
fi

if ! [[ "$COUNT" =~ ^[1-9][0-9]*$ ]]; then
  echo "RAPIDA_CALL_COUNT must be a positive integer, got: ${COUNT}" >&2
  exit 1
fi

INTERVAL="$(awk "BEGIN { printf \"%.6f\", 1 / ${CALLS_PER_SECOND} }")"
mkdir -p "$OUT_DIR"

echo "Starting rate test: ${CALLS_PER_SECOND} calls/sec, total=${COUNT}"
echo "route=${FROM_NUMBER} -> ${TO_NUMBER}"
echo "assistant=${ASSISTANT_ID}"
echo "run_id=${RUN_ID}"
echo "output_dir=${OUT_DIR}"

for i in $(seq 1 "$COUNT"); do
  file_index="$(printf "%04d" "$i")"
  (
    curl -sS -w "\nHTTP_STATUS=%{http_code}\n" -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "x-api-key: ${API_KEY}" \
      -d "{
        \"assistant\": {
          \"assistantId\": \"${ASSISTANT_ID}\",
          \"version\": \"latest\"
        },
        \"fromNumber\": \"${FROM_NUMBER}\",
        \"toNumber\": \"${TO_NUMBER}\",
        \"metadata\": {
          \"test\": \"calls-per-second-sip-call\",
          \"runId\": \"${RUN_ID}\",
          \"callIndex\": ${i},
          \"callsPerSecond\": ${CALLS_PER_SECOND},
          \"totalCalls\": ${COUNT}
        }
      }" > "${OUT_DIR}/call-${file_index}.txt"
    echo "finished call ${i}"
  ) &

  if [ "$i" -lt "$COUNT" ]; then
    sleep "$INTERVAL"
  fi
done

wait

echo
echo "Completed ${COUNT} scheduled requests at ${CALLS_PER_SECOND} calls/sec."
echo "Responses:"
for file in "${OUT_DIR}"/call-*.txt; do
  printf "%s " "$(basename "$file" .txt)"
  tail -n 1 "$file"
done
