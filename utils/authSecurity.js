export const extractBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') return null;

  const [scheme, token, extra] = authorizationHeader.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extra) return null;

  return token;
};

export const isResourceOwner = (ownerId, userId) =>
  Boolean(ownerId && userId && String(ownerId) === String(userId));

export const getVerifiedGoogleProfile = (payload) => {
  if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
    throw new Error('Google account details could not be verified');
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || 'Google User',
  };
};
