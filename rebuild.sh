#!/bin/bash

# Configuration
PROJECT_DIR="/home/paulb/cs2-nade-master"
DIST_DIR="$PROJECT_DIR/dist/nade-helper/browser"
WEB_DIR="/var/www/nade-helper"

echo "---- Starting Nade Helper Deployment ----"

# Step 1: Navigate to project directory
cd "$PROJECT_DIR" || { echo "Project directory not found!"; exit 1; }

# Step 2: Pull latest changes
echo "Pulling latest code from Git..."
git pull || { echo "Git pull failed!"; exit 1; }

# Step 3: Build Angular app
echo "Building Angular app..."
ng build --configuration production || { echo "Angular build failed!"; exit 1; }

# Step 4: Sync to web directory
echo "Syncing files to $WEB_DIR..."
sudo rsync -av --delete "$DIST_DIR/" "$WEB_DIR/" || { echo "Rsync failed!"; exit 1; }

# Step 5: Fix permissions
echo "Setting permissions..."
sudo chown -R www-data:www-data "$WEB_DIR"
sudo chmod -R 755 "$WEB_DIR"

echo "✅ Deployment complete!"
