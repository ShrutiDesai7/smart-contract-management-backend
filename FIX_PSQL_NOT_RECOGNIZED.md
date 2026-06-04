# PostgreSQL Setup Guide - Windows PowerShell

## Issue
`psql : The term 'psql' is not recognized...`

This means PostgreSQL is not in your system PATH variable.

---

## Solution 1: Find PostgreSQL Installation Path (Quick Fix)

PostgreSQL on Windows is typically installed in one of these locations:
- `C:\Program Files\PostgreSQL\<version>\bin`
- `C:\Program Files (x86)\PostgreSQL\<version>\bin`

**Step 1: Find your PostgreSQL bin folder**

In PowerShell:
```powershell
# Method 1: Find PostgreSQL installation
Get-ChildItem "C:\Program Files\" -Filter postgresql -Recurse -Directory

# Method 2: List all PostgreSQL versions
Get-ChildItem "C:\Program Files\PostgreSQL\"
```

**Step 2: Use the full path to psql**

Once you find it (e.g., `C:\Program Files\PostgreSQL\16\bin`), run:

```powershell
# Example (adjust version number to your PostgreSQL version)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f setup-database.sql
```

---

## Solution 2: Add PostgreSQL to System PATH (Permanent Fix)& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f setup-database.sql

**Step 1: Find PostgreSQL bin folder**
```powershell
Get-ChildItem "C:\Program Files\PostgreSQL\" | Select-Object Name
```

Note the version number (e.g., 16, 15, 14, etc.)

**Step 2: Add to PATH**

**Option A: Via GUI (Easiest)**
1. Press `Win + X` → Search for "Environment Variables"
2. Click "Edit the system environment variables"
3. Click "Environment Variables" button
4. Under "User variables" or "System variables", click "Path" → "Edit"
5. Click "New" and add: `C:\Program Files\PostgreSQL\16\bin` (replace 16 with your version)
6. Click "OK" → "OK" → "OK"
7. **Restart PowerShell** (close and reopen)

**Option B: Via PowerShell (Script)**
```powershell
# Run as Administrator
$postgresqlBin = "C:\Program Files\PostgreSQL\16\bin"  # Replace 16 with your version
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;$postgresqlBin"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
Write-Host "PostgreSQL added to PATH. Please restart PowerShell."
```

**Step 3: Restart PowerShell and verify**
```powershell
psql --version
```

You should see: `psql (PostgreSQL) 16.x` (or your version)

---

## Solution 3: Create a Batch Script (Alternative)

If you prefer not to modify PATH, create a script:

**Create file: `run-setup.bat`**
```batch
@echo off
REM Find and run psql with the setup script
for /d %%d in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%d\bin\psql.exe" (
        "%%d\bin\psql.exe" -U postgres -f setup-database.sql
        exit /b
    )
)
echo PostgreSQL not found in default location
pause
```

Save this file in the project root, then double-click it or run:
```powershell
.\run-setup.bat
```

---

## Solution 4: Use Windows Command Prompt (CMD)

Sometimes CMD has better PATH handling than PowerShell:

```cmd
cd C:\Users\shruti\Desktop\VScode-projects\contract-management-1
psql -U postgres -f setup-database.sql
```

---

## After Database Setup

Once you successfully create the database, verify:

```powershell
# Connect to the database
psql -U postgres -d contract_management -c "\dt"

# You should see 3 tables:
#              List of relations
#  Schema |      Name       | Type  | Owner
# --------+-----------------+-------+-------
#  public | contract_chunk  | table | postgres
#  public | contracts       | table | postgres
#  public | workflow_history| table | postgres
```

---

## Next Step: Start Backend

Once database is set up:
```powershell
./mvnw spring-boot:run
```

Then start frontend:
```powershell
cd frontend-next
npm run dev
```

---

## Troubleshooting

**Still getting "psql: command not found"?**

1. Verify PostgreSQL is installed:
   ```powershell
   Get-ChildItem "C:\Program Files\" -Name | Select-String -Pattern "PostgreSQL"
   ```

2. Check if postgres service is running:
   ```powershell
   Get-Service postgres*
   ```
   
   If not running, start it:
   ```powershell
   Start-Service -Name "postgresql-x64-16"  # Replace 16 with your version
   ```

3. Verify you can connect:
   ```powershell
   # Using full path
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" --version
   ```

**psql command works but getting auth error?**

You may need to use a different user or check PostgreSQL password:
```powershell
# Try without -U flag (uses current Windows user)
psql -d postgres

# Or specify user explicitly
psql -U postgres -h localhost
```

---

## Recommended: Add to PATH Once and For All

This is the best permanent solution. After restarting PowerShell, all PostgreSQL tools (`psql`, `pg_dump`, etc.) will work from anywhere.
