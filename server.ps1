$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:8081/')
$listener.Start()
Write-Host "Listening on http://localhost:8081"

$root = 'C:\projects\workspace\tsumori'
$mimeMap = @{
  '.html' = 'text/html'
  '.css'  = 'text/css'
  '.js'   = 'application/javascript'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.json' = 'application/json'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
}

Write-Host "Server started — Ctrl+C to stop"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $reqUrl = $ctx.Request.Url.LocalPath
  $file = if ($reqUrl -eq '/' -or $reqUrl -eq '') { 'index.html' } else { $reqUrl.TrimStart('/') }
  $fullPath = Join-Path $root $file

  if ((Test-Path $fullPath) -and (Get-Item $fullPath).Extension -ne '') {
    $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
    $ct = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.ContentType = $ct
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
