import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL || 'https://ayda-umnichka.vercel.app';

describe('Security Suite: RBAC & Cabinet Protection Tests', () => {

  describe('1. RBAC: /admin route security', () => {
    test('Anonymous request to /admin must be redirected to /login with error=forbidden', async () => {
      const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
      assert.strictEqual(res.status, 307, 'Should return 307 redirect');
      const location = res.headers.get('location') || '';
      assert.match(location, /\/login\?redirect=%2Fadmin&error=forbidden/, 'Redirect target must enforce login with forbidden flag');
    });

    test('Teacher role cannot access /admin (must be redirected)', async () => {
      const res = await fetch(`${BASE_URL}/admin`, {
        redirect: 'manual',
        headers: {
          Cookie: 'aida_active_role=teacher; aida_user_id=test_teacher_1;'
        }
      });
      assert.strictEqual(res.status, 307, 'Teacher must not enter /admin directly');
      const location = res.headers.get('location') || '';
      assert.match(location, /error=forbidden/);
    });

    test('Admin role cookie is allowed access to /admin', async () => {
      const res = await fetch(`${BASE_URL}/admin`, {
        redirect: 'manual',
        headers: {
          Cookie: 'aida_active_role=admin; aida_user_id=admin_session;'
        }
      });
      assert.strictEqual(res.status, 200, 'Admin must receive 200 OK');
    });
  });

  describe('2. RBAC: /teacher route security', () => {
    test('Anonymous request to /teacher must be redirected to /login', async () => {
      const res = await fetch(`${BASE_URL}/teacher`, { redirect: 'manual' });
      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location') || '';
      assert.match(location, /\/login\?redirect=%2Fteacher&error=forbidden/);
    });

    test('Student role cannot access /teacher', async () => {
      const res = await fetch(`${BASE_URL}/teacher`, {
        redirect: 'manual',
        headers: {
          Cookie: 'aida_active_role=student; aida_user_id=id123456;'
        }
      });
      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location') || '';
      assert.match(location, /error=forbidden/);
    });

    test('Teacher role is allowed access to /teacher', async () => {
      const res = await fetch(`${BASE_URL}/teacher`, {
        redirect: 'manual',
        headers: {
          Cookie: 'aida_active_role=teacher; aida_user_id=teacher_swetlana;'
        }
      });
      assert.strictEqual(res.status, 200, 'Teacher must receive 200 OK');
    });
  });

  describe('3. IDOR / Cabinet URL Protection: /[userId]', () => {
    test('Accessing foreign cabinet ID in address bar without credentials redirects to /login', async () => {
      const foreignId = 'foreign_victim_999';
      const res = await fetch(`${BASE_URL}/${foreignId}`, {
        redirect: 'manual',
        headers: {
          Cookie: 'aida_user_id=attacker_session_111;'
        }
      });
      assert.strictEqual(res.status, 307, 'Should block unauthorized cabinet peek');
      const location = res.headers.get('location') || '';
      assert.match(location, new RegExp(`/login\\?redirect=%2F${foreignId}&cabinetId=${foreignId}&auth_required=1`));
    });

    test('Unregistered visitor without ID is redirected to /login (ID issued only after registration)', async () => {
      const anyId = 'id888123';
      const res = await fetch(`${BASE_URL}/${anyId}`, {
        redirect: 'manual'
      });
      assert.strictEqual(res.status, 307, 'Visitor must login/register before accessing cabinet');
      const location = res.headers.get('location') || '';
      assert.match(location, new RegExp(`/login\\?redirect=%2F${anyId}&cabinetId=${anyId}&auth_required=1`));
    });

    test('Authenticated user matching cabinet ID is allowed access', async () => {
      const myAuthId = 'registered_owner_777';
      const res = await fetch(`${BASE_URL}/${myAuthId}`, {
        redirect: 'manual',
        headers: {
          Cookie: `aida_auth_user_id=${myAuthId}; aida_user_id=${myAuthId}; aida_active_role=student;`
        }
      });
      assert.strictEqual(res.status, 200, 'Authenticated owner must receive 200 OK');
    });
  });

  describe('4. Navigation /student isolation', () => {
    test('/student redirects unregistered visitor to /login', async () => {
      const res = await fetch(`${BASE_URL}/student`, {
        redirect: 'manual'
      });
      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location') || '';
      assert.strictEqual(location, '/login?redirect=%2Fstudent');
    });

    test('/student redirects authenticated user to their bound profile', async () => {
      const authId = 'student_timofey';
      const res = await fetch(`${BASE_URL}/student`, {
        redirect: 'manual',
        headers: {
          Cookie: `aida_auth_user_id=${authId}; aida_user_id=${authId}; aida_active_role=student;`
        }
      });
      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location') || '';
      assert.strictEqual(location, `/${authId}`);
    });
  });

  describe('5. API Endpoint Protections', () => {
    test('POST /api/admin/balance/adjust is rejected with 403 when called anonymously', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/balance/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
      });
      assert.strictEqual(res.status, 403, 'Must return 403 Forbidden without admin credentials');
      const body = await res.json();
      assert.match(body.error, /права администратора/i);
    });

    test('POST /api/user/bind sanitizes privilege escalation attempts (role and balanceLessons)', async () => {
      const probeId = `probe_sec_${Date.now()}`;
      const res = await fetch(`${BASE_URL}/api/user/bind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'aida_active_role=student;'
        },
        body: JSON.stringify({
          publicId: probeId,
          fullName: 'Security Probe User',
          role: 'admin',          // Attempted privilege escalation
          balanceLessons: 999999  // Attempted balance manipulation
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.binding.role, 'student', 'Role must remain student, not escalate to admin');
      assert.strictEqual(body.binding.balance_lessons, 0, 'Balance must remain 0, not tamperable by client');

      // Clean up probe record immediately
      try {
        await fetch(`${BASE_URL}/api/user/bind?publicId=${probeId}`, { method: 'DELETE' });
      } catch (_) {}
    });
  });

  describe('6. Security Headers (Defense-in-depth)', () => {
    test('Responses include X-Content-Type-Options, X-Frame-Options, Referrer-Policy', async () => {
      const res = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
      assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });
  });

});
