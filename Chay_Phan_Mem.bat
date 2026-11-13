@echo off
chcp 65001 >nul
title Smart STEM Room - Khoi dong he thong
cd /d "%~dp0"

echo ================================================================
echo         HỆ THỐNG QUẢN LÝ PHÒNG HỌC STEM THÔNG MINH
echo ================================================================
echo.
echo [1/2] Đang khởi động Máy chủ Backend & SQLite (Cổng 5000)...
start /b "" node server/server.js

echo [2/2] Đang khởi động Giao diện Web (Cổng 5173)...
echo.
echo ================================================================
echo   Trình duyệt sẽ tự động mở tại: http://localhost:5173
echo   - Backend API: http://localhost:5000/api
echo   - Cơ sở dữ liệu: SQLite (smart_stem.db)
echo.
echo   (Nhấn Ctrl + C hoặc đóng cửa sổ này khi muốn tắt phần mềm)
echo ================================================================
echo.

call npx.cmd vite --open --host

pause
