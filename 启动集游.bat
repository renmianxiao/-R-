@echo off
setlocal
chcp 65001 >nul
title 集游 - 启动项目

cd /d "%~dp0"
if errorlevel 1 goto :directory_failed
if not exist "package.json" goto :directory_failed

where node.exe >nul 2>&1
if errorlevel 1 goto :node_missing
where npm.cmd >nul 2>&1
if errorlevel 1 goto :node_missing

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 goto :node_old

if not exist "node_modules\vite\bin\vite.js" (
  echo 正在安装项目依赖，请稍候...
  call npm.cmd install
  if errorlevel 1 goto :install_failed
)

echo 正在启动集游前端和后端，启动后会自动打开浏览器。
echo 请保持此窗口打开。按 Ctrl+C 可以停止项目。
echo.
call npm.cmd run dev -- --open
if errorlevel 1 goto :startup_failed
exit /b 0

:node_missing
echo 未找到 Node.js 或 npm。请安装 Node.js 20 或更高版本后重试。
pause
exit /b 1

:node_old
echo 当前 Node.js 版本过低，请升级到 Node.js 20 或更高版本。
pause
exit /b 1

:directory_failed
echo 无法找到项目，请将本文件放在 game-shelf 项目文件夹内。
pause
exit /b 1

:install_failed
echo 依赖安装失败，请检查上方错误信息和网络连接后重试。
pause
exit /b 1

:startup_failed
echo.
echo 项目启动失败，请查看上方错误信息。
echo 如果提示端口被占用，请先在原来的项目运行窗口按 Ctrl+C 停止服务。
pause
exit /b 1
