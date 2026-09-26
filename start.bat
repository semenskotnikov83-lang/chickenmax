@echo off
title ChickenMax Server
py -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
pause
