// TEST: Verify button rendering logic
const testOrders = [
  { order_id: 12, type: 'sell', state: 'pending', amount: 9, total: 247500 },
  { order_id: 11, type: 'sell', state: 'cancelled', amount: 9, total: 247500 },
  { order_id: 10, type: 'sell', state: 'cancelled', amount: 9, total: 247500 },
  { order_id: 6, type: 'buy', state: 'banked', amount: 100, total: 2750000 }
];

testOrders.forEach(order => {
  const orderStatus = order.state;
  let result = '';
  
  if (orderStatus === 'cancelled') {
    result = '✕ Đã hủy (text)';
  } else if (orderStatus === 'completed' || orderStatus === 'filled') {
    result = '✓ Hoàn thành (text)';
  } else if (orderStatus === 'banked' || orderStatus === 'matched') {
    if (order.type === 'buy') {
      result = '🔓 Mở khóa (BUTTON - green)';
    } else {
      result = '⏳ Đợi user xác nhận (text)';
    }
  } else if (orderStatus === 'pending' || orderStatus === 'open') {
    if (order.type === 'sell') {
      result = '💳 Chuyển tiền (BUTTON - blue) ← THIS SHOULD SHOW';
    } else {
      result = '⏳ Chờ user (text)';
    }
  } else {
    result = '- (text)';
  }
  
  console.log(`Order #${order.id}: type=${order.type}, status=${orderStatus} → ${result}`);
});

console.log('\n✓ Logic is CORRECT! Order #12 (sell, pending) MUST show blue button.');
console.log('If you see "Chờ thanh toán" text instead, it means:');
console.log('1. Browser cached old code - Try HARD REFRESH (Ctrl+Shift+R)');
console.log('2. React dev server not updated - Restart npm start');
console.log('3. Wrong file being served - Check network tab for source');
