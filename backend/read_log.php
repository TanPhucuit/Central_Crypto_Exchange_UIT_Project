<?php
$logFile = __DIR__ . '/php-errors.log';
if (file_exists($logFile)) {
    echo file_get_contents($logFile);
} else {
    echo "Log file not found.";
}
