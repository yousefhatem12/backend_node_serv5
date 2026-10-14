const { requireRole, ensureActiveCandidate, ensureActiveAdmin, ensureActiveUser } = require('../../src/middlewares/roles.middleware');

describe('RBAC & Role Middlewares Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {};
    next = jest.fn();
  });

  test('requireRole allows request when user has one of allowed roles', () => {
    req.user = { role: 'admin', is_active: true };
    const middleware = requireRole('admin', 'super_admin');
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('requireRole rejects request with ForbiddenError when user role not allowed', () => {
    req.user = { role: 'candidate', is_active: true };
    const middleware = requireRole('admin', 'super_admin');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });

  test('ensureActiveCandidate allows active candidate', () => {
    req.user = { role: 'candidate', is_active: true };
    ensureActiveCandidate(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('ensureActiveCandidate rejects admin with 403', () => {
    req.user = { role: 'admin', is_active: true };
    ensureActiveCandidate(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  test('ensureActiveAdmin allows admin and super_admin', () => {
    req.user = { role: 'super_admin', is_active: true };
    ensureActiveAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('ensureActiveUser blocks inactive user with 403', () => {
    req.user = { role: 'candidate', is_active: false };
    ensureActiveUser(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});
