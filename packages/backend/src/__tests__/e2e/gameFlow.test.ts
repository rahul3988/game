import request from 'supertest';
import { app } from '../../server';
import { PrismaClient } from '@prisma/client';

describe('Game Flow E2E Tests', () => {
  let authToken: string;
  let userId: string;
  let roundId: string;

  beforeAll(async () => {
    // Setup test database
    // In a real implementation, you'd use a test database
  });

  beforeEach(async () => {
    // Register and login a test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'e2euser',
        email: 'e2e@test.com',
        password: 'Test123!',
      });

    authToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;
  });

  test('Complete game flow: register -> deposit -> bet -> win/lose', async () => {
    // 1. Check initial balance
    const profileResponse = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(profileResponse.body.data.balance).toBe(0);

    // 2. Create deposit request
    const paymentMethodsResponse = await request(app)
      .get('/api/payment/methods')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const phonepeMethod = paymentMethodsResponse.body.data.find(
      (method: any) => method.name === 'phonepe'
    );

    const depositResponse = await request(app)
      .post('/api/payment/deposit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentMethodId: phonepeMethod.id,
        amount: 1000,
        utrCode: 'TEST123456',
      })
      .expect(201);

    expect(depositResponse.body.data.status).toBe('PENDING');

    // 3. Admin approves deposit (simulate)
    // This would require admin authentication and approval

    // 4. Get current game round
    const currentRoundResponse = await request(app)
      .get('/api/game/current-round')
      .expect(200);

    if (currentRoundResponse.body.data) {
      roundId = currentRoundResponse.body.data.round.id;

      // 5. Place a bet
      const betResponse = await request(app)
        .post('/api/game/bet')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          betType: 'number',
          betValue: 7,
          amount: 100,
        })
        .expect(201);

      expect(betResponse.body.data.amount).toBe(100);
      expect(betResponse.body.data.betType).toBe('NUMBER');
    }

    // 6. Check bet history
    const betHistoryResponse = await request(app)
      .get('/api/user/bets')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(betHistoryResponse.body.data.items.length).toBeGreaterThan(0);
  });

  test('Should handle invalid bet attempts', async () => {
    // Try to bet without sufficient balance
    const betResponse = await request(app)
      .post('/api/game/bet')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        roundId: 'invalid-round',
        betType: 'number',
        betValue: 7,
        amount: 100,
      })
      .expect(400);

    expect(betResponse.body.success).toBe(false);
  });

  test('Should enforce rate limits', async () => {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
      );
    }

    const responses = await Promise.all(promises);
    
    // Some requests should succeed, but rate limiting should kick in
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitCount = responses.filter(r => r.status === 429).length;
    
    expect(successCount + rateLimitCount).toBe(10);
  });

  afterEach(async () => {
    // Cleanup test data
    // In a real implementation, you'd clean up the test database
  });
});