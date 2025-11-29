const testLogin = async () => {
    const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            login: 'wronguser',
            password: 'wrongpass'
        })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
};

testLogin();
