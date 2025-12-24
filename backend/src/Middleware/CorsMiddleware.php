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
        $allowOrigin = $this->resolveAllowedOrigin($origin, $allowedOrigins);
        
        // If origin not in allowed list, default to first allowed origin or *
        if (!$allowOrigin) {
            $allowOrigin = $allowedOrigins[0] ?? '*';
        }

        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            $response = new Response();
            $response = $response
                ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
                ->withHeader('Access-Control-Allow-Methods', implode(', ', $config['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']))
                ->withHeader('Access-Control-Allow-Headers', implode(', ', $config['allowed_headers'] ?? ['Content-Type', 'Authorization', 'X-Requested-With']))
                ->withHeader('Access-Control-Allow-Credentials', 'true')
                ->withHeader('Access-Control-Max-Age', (string)($config['max_age'] ?? 3600))
                ->withStatus(200);
            return $response;
        }

        // Process the request
        $response = $handler->handle($request);

        // Add CORS headers to response
        $response = $response
            ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
            ->withHeader('Access-Control-Allow-Methods', implode(', ', $config['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']))
            ->withHeader('Access-Control-Allow-Headers', implode(', ', $config['allowed_headers'] ?? ['Content-Type', 'Authorization', 'X-Requested-With']))
            ->withHeader('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
