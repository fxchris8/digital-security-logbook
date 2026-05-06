#!/bin/sh
set -e

echo "========================================="
echo "Digital Security Logbook Backend - Starting"
echo "========================================="

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until nc -z -v -w30 $DB_HOST $DB_PORT
do
  echo "Waiting for database connection at $DB_HOST:$DB_PORT..."
  sleep 2
done

echo "MySQL is ready!"

# Start the API server
echo "Starting API server..."
exec ./api
