<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Helpers\Database;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class HealthController
{
    public function check(Request $request, ResponseInterface $response): ResponseInterface
    {
        return Response::success($response, [
            'status' => 'ok',
            'timestamp' => time()
        ]);
    }

    public function database(Request $request, ResponseInterface $response): ResponseInterface
    {
        $result = Database::testConnection();
        
        if ($result['success']) {
            return Response::success($response, $result);
        } else {
            return Response::error($response, $result['message'], 500, ['error' => $result['error']]);
        }
    }
}
