#!/bin/zsh
# ECLIPTARA — double-click to launch locally on macOS
cd "$(dirname "$0")"
open "http://localhost:4173"
node server.js
