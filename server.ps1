$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Get-Command node -ErrorAction SilentlyContinue

if (-not $node) {
  throw 'Node.js is required to run the local static server.'
}

Set-Location $root
& $node.Source "$root\server.js"
