const BaseResource = require('./base.resource');

class UserResource extends BaseResource {
  static toArray(user) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      avatar: user.avatar || null,
      avater: user.avatar || null,
      role: user.role,
      is_active: Boolean(user.is_active),
      email_verified_at: user.email_verified_at ? user.email_verified_at.toISOString() : null,
      created_at: user.created_at ? user.created_at.toISOString() : undefined
    };
  }
}

module.exports = UserResource;
