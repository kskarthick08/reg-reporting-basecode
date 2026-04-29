#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Starting application..."
exec "$@"
