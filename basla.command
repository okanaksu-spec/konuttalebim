#!/bin/bash
# Konuttalebim'i bilgisayarinda calistirir.
# Bu dosyaya cift tiklamak yeterli (Mac).
cd "$(dirname "$0")/server" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js kurulu degil. Once https://nodejs.org adresinden Node 22 (LTS) kurun."
  echo "Kapatmak icin bu pencereyi kapatabilirsiniz."
  read -r _
  exit 1
fi

echo "Konuttalebim baslatiliyor..."
echo "Tarayicida http://localhost:3000 acilacak."
echo "Durdurmak icin bu pencerede Control + C yapin."
( sleep 2 && open "http://localhost:3000" ) &
node --experimental-sqlite server.mjs
