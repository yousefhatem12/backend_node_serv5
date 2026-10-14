const UserResource = require('./user.resource');

class AuthTokenResource {
  static toArray({ access_token, refresh_token, token_type, expires_in, user }) {
    return {
      access_token,
      refresh_token: refresh_token || null,
      token_type: token_type || 'bearer',
      expires_in: expires_in || 3600,
      user: UserResource.toArray(user)
    };
  }
}

module.exports = AuthTokenResource;
