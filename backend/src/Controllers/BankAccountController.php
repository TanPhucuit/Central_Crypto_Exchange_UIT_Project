<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\AccountTransaction;
use App\Models\BankAccount;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class BankAccountController
{
    public function index(Request $request, ResponseInterface $response): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        $bankModel = new BankAccount();
        $accounts = $bankModel->getByUserId($userId);

        return Response::success($response, $accounts);
    }

    public function create(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        if (empty($data['user_id'])) {
            return Response::error($response, 'user_id is required', 400);
        }

        if (empty($data['account_number']) || empty($data['bank_name'])) {
            return Response::error($response, 'Account number and bank name are required', 400);
        }

        $bankModel = new BankAccount();
        
        $account = $bankModel->findByAccountNumber($data['account_number']);
        return Response::success($response, $account, 'Bank account created', 201);
    }

    public function delete(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;
        $accountNumber = $args['accountNumber'];

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }
        
        $bankModel = new BankAccount();
        $account = $bankModel->findByAccountNumber($accountNumber);

        if (!$account || $account['user_id'] != $userId) {
            return Response::error($response, 'Account not found', 404);
        }

        $bankModel->delete($accountNumber);
        return Response::success($response, null, 'Bank account deleted');
    }

    public function transfer(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();
        $userId = $data['user_id'] ?? null;
        $sourceAccount = $data['from_account'] ?? null;
        $targetAccount = $data['to_account'] ?? null;
        $amount = isset($data['amount']) ? (float)$data['amount'] : null;
        $note = $data['note'] ?? null;

        if (!$userId || !$sourceAccount || !$targetAccount || $amount === null) {
            return Response::error($response, 'Missing required fields: user_id, from_account, to_account, amount', 400);
        }

        if ($amount <= 0) {
            return Response::error($response, 'Amount must be greater than zero', 400);
        }

        $bankModel = new BankAccount();
        $source = $bankModel->findByAccountNumber($sourceAccount);
        $target = $bankModel->findByAccountNumber($targetAccount);

        if (!$source) {
            return Response::error($response, 'Source account not found', 404);
        }

        if ((int)$source['user_id'] !== (int)$userId) {
            return Response::error($response, 'Source account does not belong to the user', 403);
        }

        if (!$target) {
            return Response::error($response, 'Destination account not found', 404);
        }

        try {
            $result = $bankModel->transferFunds($sourceAccount, $targetAccount, $amount);

            $transactionModel = new AccountTransaction();
            $transactionId = $transactionModel->create([
                'source_account_number' => $sourceAccount,
                'target_account_number' => $targetAccount,
                'transaction_amount' => $amount,
                'note' => $note,
            ]);

            return Response::success($response, [
                'transaction_id' => $transactionId,
                'source_account' => $result['source'],
                'target_account' => $result['target'],
            ], 'Transfer completed successfully');
        } catch (\InvalidArgumentException $e) {
            return Response::error($response, $e->getMessage(), 400);
        } catch (\RuntimeException $e) {
            return Response::error($response, $e->getMessage(), 400);
        } catch (\Throwable $e) {
            return Response::error($response, 'Failed to complete transfer: ' . $e->getMessage(), 500);
        }
    }

    public function transactions(Request $request, ResponseInterface $response): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;
        $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : 100;

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        $bankModel = new BankAccount();
        $accounts = $bankModel->getByUserId((int)$userId);

        if (empty($accounts)) {
            return Response::success($response, []);
        }

        $accountNumbers = array_map(static function ($account) {
            return $account['account_number'];
        }, $accounts);

        $transactionModel = new AccountTransaction();
        $transactions = $transactionModel->getByAccountNumbers($accountNumbers, max(1, $limit));

        $normalized = array_map(static function ($tx) use ($accountNumbers) {
            $isOutgoing = in_array($tx['source_account_number'], $accountNumbers, true);
            return [
                'transaction_id' => $tx['transaction_id'],
                'type' => $isOutgoing ? 'outgoing' : 'incoming',
                'amount' => (float)$tx['transaction_amount'],
                'note' => $tx['note'] ?? null,
                'source_account' => $tx['source_account_number'],
                'target_account' => $tx['target_account_number'],
                'timestamp' => $tx['ts'],
            ];
        }, $transactions);

        return Response::success($response, $normalized);
    }
    public function lookup(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();
        $accountNumber = $data['account_number'] ?? null;
        $bankName = $data['bank_name'] ?? null;

        if (!$accountNumber) {
            return Response::error($response, 'Account number is required', 400);
        }

        $bankModel = new BankAccount();
        $account = $bankModel->findByAccountNumber($accountNumber);

        if (!$account) {
            return Response::error($response, 'Account not found', 404);
        }

        // Optional: Validate bank name if provided
        if ($bankName && strcasecmp($account['bank_name'], $bankName) !== 0) {
             return Response::error($response, 'Account found but bank name does not match', 404);
        }

        $userModel = new \App\Models\User();
        $user = $userModel->findById($account['user_id']);

        if (!$user) {
            return Response::error($response, 'User not found', 404);
        }

        return Response::success($response, [
            'account_name' => $user['fullname'] ?? $user['username'],
            'bank_name' => $account['bank_name']
        ]);
    }
}
