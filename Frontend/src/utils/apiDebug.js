// API Debug Utility
// Use this to test API connectivity

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const testAPIConnection = async () => {
    console.log('🔍 Testing API Connection...');
    console.log('📍 API Base URL:', API_BASE_URL);
    console.log('📍 Current Origin:', window.location.origin);

    try {
        // Test 1: Health Check
        console.log('\n✅ Test 1: Health Check Endpoint');
        const healthResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!healthResponse.ok) {
            console.error('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
        } else {
            const healthData = await healthResponse.json();
            console.log('✅ Health check passed:', healthData);
        }

        // Test 2: Wallet Endpoint (without user_id to see error response)
        console.log('\n✅ Test 2: Wallet Endpoint (should return error without user_id)');
        const walletResponse = await fetch(`${API_BASE_URL}/wallet`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const walletData = await walletResponse.json();
        console.log('📦 Wallet endpoint response:', walletData);

        console.log('\n✅ All tests completed!');
        return true;
    } catch (error) {
        console.error('❌ API Connection Test Failed:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
        });
        return false;
    }
};

// Auto-run on import in development
if (process.env.NODE_ENV === 'development') {
    console.log('🚀 API Debug utility loaded. Run testAPIConnection() to test connection.');
}

export default testAPIConnection;
