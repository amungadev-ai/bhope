<?php
// One-off server diagnostic — NO SSH required.
// Upload into the document root, open in a browser once, write down the
// values, then DELETE this file. It prints server paths only, no secrets.

header('Content-Type: text/plain; charset=utf-8');
echo "Beacon of Hope server diagnostic\n";
echo "================================\n";
echo "PHP version:        " . PHP_VERSION . "\n";
echo "This file's folder: " . __DIR__ . "\n";
echo "DOCUMENT_ROOT:      " . ($_SERVER['DOCUMENT_ROOT'] ?? '(not set)') . "\n";
echo "HOME:               " . (getenv('HOME') ?: '(not set)') . "\n\n";
echo "Use these to fill .htaccess: PassengerAppRoot = the folder containing\n";
echo "app.cjs (hope_api); this file's folder should be its public/ docroot.\n\n";

$disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
$canShell = !in_array('shell_exec', $disabled, true) && !in_array('exec', $disabled, true);
if ($canShell) {
    echo "--- Node binaries found on this server ---\n";
    foreach (['which -a node', 'node -v', '/usr/local/bin/node -v'] as $cmd) {
        $out = shell_exec($cmd . ' 2>&1');
        echo "\$ {$cmd}\n" . (rtrim((string) $out) !== '' ? rtrim((string) $out) . "\n" : "(no output)\n");
    }
    echo "\nUse a v22.13+ (ideally 24 LTS) binary for PassengerNodejs.\n";
} else {
    echo "shell_exec is disabled on this host.\n";
    echo "Read the Node version from the Node manager dropdown in the panel,\n";
    echo "or ask the hosting provider which versions are available.\n";
}

echo "\nIMPORTANT: delete this file after reading it.\n";
