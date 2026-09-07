$res = Invoke-RestMethod -Uri "https://api.github.com/repos/longgoll/flow-git/actions/runs/34077394626/jobs" -Headers @{"User-Agent"="PowerShell"}
$res.jobs | Select-Object name, status, conclusion
