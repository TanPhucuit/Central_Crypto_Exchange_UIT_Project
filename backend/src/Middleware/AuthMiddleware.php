<?php

namespace App\Middleware;

use App\Helpers\JWTHelper;
use App\Helpers\Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response as SlimResponse;

class AuthMiddleware
{
    public function __invoke(Request $request, RequestHandler $handler): SlimResponse
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (empty($authHeader)) {
            $response = new SlimResponse();
            return Response::error($response, 'Authorization token required', 401);
        }

        // Extract token from "Bearer <token>"
        $token = null;
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }

        if (!$token) {
            $response = new SlimResponse();
            return Response::error($response, 'Invalid authorization format', 401);
        }

        try {
            $decoded = JWTHelper::decode($token);
            
            // Add user info to request attributes
            $request = $request->withAttribute('user', $decoded);
            
            return $handler->handle($request);
        } catch (\Exception $e) {
            $response = new SlimResponse();
            return Response::error($response, 'Invalid or expired token', 401);
        }
    }
}
