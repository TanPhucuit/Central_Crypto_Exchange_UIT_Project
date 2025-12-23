<?php

namespace App\Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response;

class CorsMiddleware
{
    private function resolveAllowedOrigin(string $origin, array $allowedOrigins): ?string
    {
        if ($origin === '') {
            return in_array('*', $allowedOrigins, true) ? '*' : null;
        }

        foreach ($allowedOrigins as $allowed) {
            if ($allowed === '*') {
                return $origin;
            }

            if ($allowed === $origin) {
                return $origin;
            }

            if (str_contains($allowed, '*')) {
                $pattern = '#^' . str_replace('\*', '.*', preg_quote($allowed, '#')) . '$#';
                if (preg_match($pattern, $origin)) {
                    return $origin;
                }
            }
        }

        return null;
    }

    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        // Load allowed origins from config
        $config = require __DIR__ . '/../../config/cors.php';
        $allowedOrigins = $config['allowed_origins'] ?? ['http://localhost:3000'];

        $origin = $request->getHeaderLine('Origin');
        $allowOrigin = null;
        if ($origin) {
            foreach ($allowedOrigins as $allowed) {
                if ($allowed === '*') {
                    $allowOrigin = $origin;
                    break;
                }
                if ($allowed === $origin) {
                    $allowOrigin = $origin;
                    break;
                }
                if (strpos($allowed, '*') !== false) {
                    $pattern = '#^' . str_replace('\\*', '.*', preg_quote($allowed, '#')) . '$#';
                    if (preg_match($pattern, $origin)) {
                        $allowOrigin = $origin;
                        break;
                    }
                }
            }
        }
        // Nếu không hợp lệ hoặc không có Origin thì trả về *
        if (!$allowOrigin) {
            $allowOrigin = '*';
        }

        if ($request->getMethod() === 'OPTIONS') {
            $response = new Response();
        } else {
            $response = $handler->handle($request);
        }

        $response = $response
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
            ->withHeader('Access-Control-Allow-Credentials', 'true');

        $response = $response->withHeader('Access-Control-Allow-Origin', $allowOrigin);
        return $response;
    }
}
