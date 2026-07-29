$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $RootDir "query-multi-supported-modes.js") $RootDir
