#!/bin/sh
# Restarts the Passenger app after a .env or code change (SSH route).
# Run from the app root:  sh restart.sh
mkdir -p tmp && touch tmp/restart.txt && echo "Passenger restart signal written (tmp/restart.txt)."
