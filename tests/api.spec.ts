import { test, expect } from '@playwright/test';

test.describe('QIWI API Тесты', () => {
  const baseURL = 'https://edge.qiwi.com';
  const token = 'test_token_123';
  const wallet = '79999999999';
  
  // Переменная для хранения ID транзакции между тестами
  let transactionId: string;

  // 1. Проверка доступности сервиса (Получение профиля)
  test('1. Проверка доступности сервиса', async ({ request }) => {
    const response = await request.get(`${baseURL}/person-profile/v1/profile/current`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('authInfo');
  });

  // 2. Проверка баланса (баланс должен быть больше 0)
  test('2. Проверка баланса рублевого счета', async ({ request }) => {
    const response = await request.get(`${baseURL}/funding-sources/v2/persons/${wallet}/accounts`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    const rubAccount = body.accounts.find((acc: any) => acc.alias === 'qw_wallet_rub');
    
    expect(rubAccount).toBeDefined();
    expect(rubAccount.balance).toBeDefined();
    expect(rubAccount.balance.amount).toBeGreaterThan(0);
    expect(rubAccount.balance.currency).toBe(643);
  });

  // 3. Создание платежа на 1 рубль
  test('3. Создание платежа на 1 рубль', async ({ request }) => {
    const paymentId = Date.now().toString();

    const response = await request.post(`${baseURL}/sinap/api/v2/terms/99/payments`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: {
        "id": paymentId,
        "sum": { "amount": 1, "currency": "643" },
        "paymentMethod": { "type": "Account", "accountId": "643" },
        "comment": "Тестовый платеж 1 рубль",
        "fields": { "account": wallet }
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.transaction).toBeDefined();
    expect(body.transaction.state.code).toBe('Accepted');
    
    // Сохраняем ID транзакции для следующего теста
    transactionId = body.transaction.id;
  });

  // 4. Проверка исполнения платежа
  test('4. Проверка исполнения платежа', async ({ request }) => {
    expect(transactionId).toBeDefined();

    const response = await request.get(`${baseURL}/payment-history/v2/transactions/${transactionId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.sum.amount).toBe(1);
    expect(['SUCCESS', 'WAITING']).toContain(body.status);
  });
});
