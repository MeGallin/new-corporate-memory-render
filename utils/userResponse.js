const publicUserFields = Object.freeze([
  '_id',
  'name',
  'email',
  'isAdmin',
  'isConfirmed',
  'isSuspended',
  'profileImage',
  'ipAddress',
  'loginCounter',
  'registeredWithGoogle',
  'createdAt',
  'updatedAt',
]);

export const toPublicUser = (user) => {
  if (!user) return null;

  const source = typeof user.toObject === 'function' ? user.toObject() : user;

  return publicUserFields.reduce((result, field) => {
    if (source[field] !== undefined) result[field] = source[field];
    return result;
  }, {});
};
