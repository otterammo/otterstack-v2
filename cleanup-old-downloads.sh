#!/bin/bash
# Cleanup script for old downloads that weren't removed by Sonarr/Radarr
# Removes files and directories older than 30 days from the downloads directory

DOWNLOADS_DIR="/mnt/external/downloads"
INCOMPLETE_DIR="/mnt/external/downloads/incomplete"
LOG_FILE="/home/otterammo/media/logs/download-cleanup.log"
AGE_DAYS=30

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

echo "$(date): Starting cleanup of downloads older than $AGE_DAYS days" >> "$LOG_FILE"

# Count files/directories before cleanup
BEFORE_COUNT=$(find "$DOWNLOADS_DIR" -maxdepth 1 ! -path "$DOWNLOADS_DIR" ! -path "$INCOMPLETE_DIR" | wc -l)
BEFORE_SIZE=$(du -sh "$DOWNLOADS_DIR" 2>/dev/null | cut -f1)

# Remove files older than specified days (excluding incomplete directory)
# Using -mtime +30 means "modified more than 30 days ago"
find "$DOWNLOADS_DIR" -maxdepth 1 -type f -mtime +$AGE_DAYS -delete 2>> "$LOG_FILE"

# Remove empty directories older than specified days (excluding incomplete)
find "$DOWNLOADS_DIR" -maxdepth 1 -type d -empty -mtime +$AGE_DAYS -delete 2>> "$LOG_FILE"

# Remove non-empty directories older than specified days (excluding incomplete)
find "$DOWNLOADS_DIR" -maxdepth 1 -type d ! -path "$DOWNLOADS_DIR" ! -path "$INCOMPLETE_DIR" -mtime +$AGE_DAYS -exec rm -rf {} + 2>> "$LOG_FILE"

# Count files/directories after cleanup
AFTER_COUNT=$(find "$DOWNLOADS_DIR" -maxdepth 1 ! -path "$DOWNLOADS_DIR" ! -path "$INCOMPLETE_DIR" | wc -l)
AFTER_SIZE=$(du -sh "$DOWNLOADS_DIR" 2>/dev/null | cut -f1)
REMOVED=$((BEFORE_COUNT - AFTER_COUNT))

echo "$(date): Cleanup complete. Removed $REMOVED items. Size before: $BEFORE_SIZE, after: $AFTER_SIZE" >> "$LOG_FILE"
