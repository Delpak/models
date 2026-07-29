$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $RootDir "query-union-modalities.js") $RootDir
