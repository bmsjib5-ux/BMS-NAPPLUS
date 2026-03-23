@echo off
cd /d "d:\BMS API Session"
start "" "http://127.0.0.1:5500/lab-items-dashboard.html"
npx -y live-server --port=5500 --no-browser
