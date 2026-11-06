@echo off
rem ------------------------------------------------------------------
rem  Shopno Bilash Properties - run the website on THIS computer
rem  with the local TEST database (prisma\dev.db), never the live one.
rem
rem  Double-click this file. When the black window says "Ready",
rem  open  http://localhost:3000   (it opens by itself after a few seconds).
rem  To stop the website: click the black window and press Ctrl+C, or close it.
rem ------------------------------------------------------------------
cd /d "%~dp0"

echo.
echo  Local TEST database - changes here do NOT touch the live website.
echo.

rem Use the local SQLite database and turn on the one-click test login buttons (local only).
set DATABASE_URL=file:./dev.db
set NEXT_PUBLIC_ENABLE_DEV_LOGIN=true

if not exist node_modules (
  echo  First run: installing packages, this takes a few minutes...
  call npm install
)

rem The database driver for the local file database (the live site uses a different one).
call npx prisma generate --schema prisma/schema.local.prisma

rem Open the browser after the server has had time to start.
start "" cmd /c "timeout /t 12 >nul & start http://localhost:3000"

call npm run dev
pause
