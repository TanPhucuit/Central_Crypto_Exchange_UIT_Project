<?php

namespace App\Helpers;

class Response
{
    public static function json($response, array $data, int $status = 200)
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    public static function success($response, $data = null, string $message = 'Success', int $status = 200)
    {
        return self::json($response, [
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $status);
    }

    public static function error($response, string $message = 'Error', int $status = 400, $errors = null)
    {
        $payload = [
            'success' => false,
            'message' => $message
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return self::json($response, $payload, $status);
    }
}
