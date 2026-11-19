#!/bin/bash
# Idempotent dev server startup for preview
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ | grep -q "200"; then
  echo "Dev server already running on port 8080"
  exit 0
fi

cd /home/arham/EE
npm run dev &

# Wait up to 30 seconds for server to respond
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ | grep -q "200"; then
    echo "Dev server ready at http://127.0.0.1:8080"
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for dev server"
exit 1