$ErrorActionPreference = "Stop"
python "$PSScriptRoot\analyze_reference.py"
Write-Host "Generated files are under analysis\generated"
