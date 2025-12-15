import React, { useState } from 'react';
import './APITester.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const APITester = () => {
    const [results, setResults] = useState([]);
    const [testing, setTesting] = useState(false);

    const addResult = (test, status, message, data = null) => {
        setResults(prev => [...prev, { test, status, message, data, time: new Date().toLocaleTimeString() }]);
    };

    const runTests = async () => {
        setResults([]);
        setTesting(true);

        try {
            // Test 1: Health Check
            addResult('Health Check', 'running', 'Testing /api/health...');
            try {
                const healthRes = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
                const healthData = await healthRes.json();
                if (healthRes.ok) {
                    addResult('Health Check', 'success', 'Backend is running!', healthData);
                } else {
                    addResult('Health Check', 'error', `HTTP ${healthRes.status}: ${healthRes.statusText}`, healthData);
                }
            } catch (err) {
                addResult('Health Check', 'error', `Connection failed: ${err.message}`);
            }

            // Test 2: Wallet Endpoint (no user_id)
            addResult('Wallet Endpoint', 'running', 'Testing /api/wallet...');
            try {
                const walletRes = await fetch(`${API_BASE_URL}/wallet`);
                const walletData = await walletRes.json();
                if (walletRes.ok || walletRes.status === 400) {
                    addResult('Wallet Endpoint', 'success', 'Endpoint is accessible!', walletData);
                } else {
                    addResult('Wallet Endpoint', 'error', `HTTP ${walletRes.status}`, walletData);
                }
            } catch (err) {
                addResult('Wallet Endpoint', 'error', `Connection failed: ${err.message}`);
            }

            // Test 3: CORS Check
            addResult('CORS Check', 'running', 'Checking CORS headers...');
            try {
                const corsRes = await fetch(`${API_BASE_URL}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const corsHeaders = {
                    'Access-Control-Allow-Origin': corsRes.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Methods': corsRes.headers.get('Access-Control-Allow-Methods'),
                    'Access-Control-Allow-Headers': corsRes.headers.get('Access-Control-Allow-Headers'),
                };
                if (corsHeaders['Access-Control-Allow-Origin']) {
                    addResult('CORS Check', 'success', 'CORS is configured!', corsHeaders);
                } else {
                    addResult('CORS Check', 'warning', 'CORS headers not found', corsHeaders);
                }
            } catch (err) {
                addResult('CORS Check', 'error', `CORS check failed: ${err.message}`);
            }

        } catch (err) {
            addResult('General Error', 'error', err.message);
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="api-tester">
            <div className="api-tester-header">
                <h3>🔧 API Connection Tester</h3>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={runTests}
                    disabled={testing}
                >
                    {testing ? 'Testing...' : 'Run Tests'}
                </button>
            </div>

            <div className="api-info">
                <p><strong>API Base URL:</strong> {API_BASE_URL}</p>
                <p><strong>Current Origin:</strong> {window.location.origin}</p>
            </div>

            {results.length > 0 && (
                <div className="test-results">
                    {results.map((result, idx) => (
                        <div key={idx} className={`test-result test-${result.status}`}>
                            <div className="test-header">
                                <span className="test-name">{result.test}</span>
                                <span className="test-time">{result.time}</span>
                                <span className={`test-status status-${result.status}`}>
                                    {result.status === 'success' && '✅'}
                                    {result.status === 'error' && '❌'}
                                    {result.status === 'warning' && '⚠️'}
                                    {result.status === 'running' && '⏳'}
                                </span>
                            </div>
                            <div className="test-message">{result.message}</div>
                            {result.data && (
                                <details className="test-data">
                                    <summary>View Data</summary>
                                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default APITester;
