<?php
// Passenger restart WITHOUT SSH: open this file's URL once in the browser
// after uploading code, editing .env, or importing the SQL schema — it
// touches tmp/restart.txt, which restarts the Passenger app.
//
// Works from the app root OR from public/ (the document root): it looks for
// app.cjs here first, then one directory up.
$appRoot = is_file(__DIR__ . '/app.cjs') ? __DIR__ : dirname(__DIR__);
if (!is_file($appRoot . '/app.cjs')) {
    $appRoot = __DIR__; // fallback: edit this line to the app folder path
}
$target = rtrim($appRoot, '/') . '/tmp/restart.txt';

header('Content-Type: text/plain; charset=utf-8');
if (!is_dir(dirname($target))) {
    @mkdir(dirname($target), 0775, true);
}
echo @touch($target)
    ? "Restart signal written in {$appRoot}\nWait ~10 seconds, then reload the API health URL.\n"
    : "FAILED to write {$target} — check folder permissions, or create\ntmp/restart.txt by hand in the hosting File Manager.\n";
