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
        $config = require __DIR__ . '/../../config/cors.php';
        
        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            $response = new Response();
        } else {
            $response = $handler->handle($request);
        }

        $origin = $request->getHeaderLine('Origin') ?? '';
        $allowedOrigins = $config['allowed_origins'];
        $allowedOriginValue = $this->resolveAllowedOrigin($origin, $allowedOrigins);

        if ($allowedOriginValue !== null) {
            $responseOrigin = $allowedOriginValue === '*' ? '*' : $origin;

            $response = $response
                ->withHeader('Access-Control-Allow-Origin', $responseOrigin)
                ->withHeader('Access-Control-Allow-Methods', implode(', ', $config['allowed_methods']))
                ->withHeader('Access-Control-Allow-Headers', implode(', ', $config['allowed_headers']))
                ->withHeader('Access-Control-Max-Age', (string)$config['max_age'])
                ->withHeader('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}
