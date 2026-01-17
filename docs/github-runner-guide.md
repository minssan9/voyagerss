# GitHub Self-hosted Runner Setup Guide (Windows)

This guide provides step-by-step instructions on how to set up your local Windows PC as a GitHub Self-hosted Runner. This allows GitHub Actions to deploy code directly to your machine.

## Prerequisites

1.  **Git for Windows**: Installed and available in PowerShell.
2.  **Docker Desktop**: Installed and running (required for Docker-based deployments).
3.  **PowerShell**: Access to PowerShell terminal.

## Step 1: Download & Configure Runner

1.  Go to your GitHub Repository.
2.  Navigate to **Settings** > **Actions** > **Runners**.
3.  Click the **New self-hosted runner** button.
4.  Select **Windows** as the runner image.

### Download
Run the following commands in PowerShell (created a folder for the runner, e.g., `C:\actions-runner`):

```powershell
# Create a folder
mkdir actions-runner; cd actions-runner

# Download the latest runner package
# (Copy the specific command from your GitHub Settings page as it contains the version number)
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.xxx.x/actions-runner-win-x64-2.xxx.x.zip -OutFile actions-runner-win-x64-2.xxx.x.zip

# Extract the installer
Add-Type -AssemblyName System.IO.Compression.FileSystem ; [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.xxx.x.zip", "$PWD")
```

### Configure
Run the configuration script. You will need the **token** provided on the GitHub Settings page.

```powershell
./config.cmd --url https://github.com/YOUR_ORG/YOUR_REPO --token YOUR_TOKEN
```

**Configuration Prompts:**
1.  **Runner group**: Press Enter for Default.
2.  **Name of runner**: Press Enter to use your PC name, or type a custom name (e.g., `my-dev-pc`).
3.  **Labels**: **IMPORTANT**: Type `self-hosted,windows` (or just press Enter if `self-hosted` is default). Ensure your workflow file uses `runs-on: self-hosted`.
4.  **Work folder**: Press Enter for `_work`.

## Step 2: Run the Runner

### Option A: Run Interactively (Good for testing)
To start the runner immediately in your terminal:

```powershell
./run.cmd
```
You will see `Listening for Jobs...`. Keep this window open.

### Option B: Run as a Service (Recommended for permanent setup)
This runs the runner in the background and automatically starts it when Windows boots.

**If you have already configured the runner via command line:**
1. Stop the runner (Ctrl+C).
2. Remove the existing configuration:
   ```powershell
   ./config.cmd remove --token YOUR_TOKEN
   ```

**To install as a service:**
Run the following commands in an **Administrator** PowerShell:

```powershell
# Configure as a service (replace URL and Token)
./config.cmd --url https://github.com/YOUR_ORG/YOUR_REPO --token YOUR_TOKEN --runasservice

# The service should start automatically.
# Check status using Windows Services app (services.msc) -> Look for "GitHub Actions Runner"
```

## Step 3: Verification

1.  Go back to **Settings** > **Actions** > **Runners** on GitHub.
2.  You should see your runner listed with a green "Idle" status.
3.  Push a commit to the `main` branch.
4.  The runner should pick up the job, and you'll see logs in the terminal (if running interactively) or on the GitHub Actions tab.

## Troubleshooting

### Encoding Issues (UTF-8 vs UTF-16)
If you see errors like `unexpected character` when creating files (e.g., `.env`), ensure your workflow uses explicit UTF-8 encoding in PowerShell:

```yaml
- name: Create file
  shell: powershell
  run: |
    $content = "${{ secrets.MY_SECRET }}"
    [System.IO.File]::WriteAllText("filename.txt", $content, [System.Text.Encoding]::UTF8)
```

### Permission Denied
If the runner cannot execute Docker commands:
- Ensure Docker Desktop is running.
- Ensure the user running the runner has permission to access Docker.
