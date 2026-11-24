const User = require('../models/User');

const OFFICIAL_USERNAME = 'pulsechat_official';
const OFFICIAL_EMAIL = 'official@pulsechat.io';
const DEFAULT_OFFICIAL_NAME = 'PulseChat';
const DEFAULT_OFFICIAL_AVATAR = '/icons/icon-192.png';

/**
 * Returns or creates the singleton Official PulseChat system user.
 * This user represents the unified identity for all official stories and replies.
 */
const getOrCreateOfficialUser = async (nameOverride, avatarOverride) => {
  try {
    let official = await User.findOne({
      $or: [
        { username: OFFICIAL_USERNAME },
        { email: OFFICIAL_EMAIL }
      ]
    });

    if (!official) {
      official = await User.create({
        username: OFFICIAL_USERNAME,
        nickname: nameOverride || DEFAULT_OFFICIAL_NAME,
        email: OFFICIAL_EMAIL,
        password: 'system_account_pulsechat_official_2026',
        role: 'admin',
        isOfficial: true,
        isEmailVerified: true,
        avatar: avatarOverride || DEFAULT_OFFICIAL_AVATAR,
        bio: 'Official PulseChat System & Updates Channel'
      });
    } else {
      let needsSave = false;
      if (!official.isOfficial) {
        official.isOfficial = true;
        needsSave = true;
      }
      if (!official.avatar || official.avatar.includes('1618005182384')) {
        official.avatar = DEFAULT_OFFICIAL_AVATAR;
        needsSave = true;
      }
      if (nameOverride && official.nickname !== nameOverride) {
        official.nickname = nameOverride;
        needsSave = true;
      }
      if (avatarOverride && official.avatar !== avatarOverride) {
        official.avatar = avatarOverride;
        needsSave = true;
      }
      if (needsSave) {
        await official.save();
      }
    }

    return official;
  } catch (error) {
    console.error('[Official Account Error]', error);
    // Fallback: search any admin user
    const fallbackAdmin = await User.findOne({ role: 'admin' });
    return fallbackAdmin;
  }
};

const isOfficialUser = (user) => {
  if (!user) return false;
  if (user.isOfficial) return true;
  const username = (user.username || '').toLowerCase();
  return username === OFFICIAL_USERNAME || username === 'pulsechat';
};

module.exports = {
  OFFICIAL_USERNAME,
  OFFICIAL_EMAIL,
  DEFAULT_OFFICIAL_NAME,
  DEFAULT_OFFICIAL_AVATAR,
  getOrCreateOfficialUser,
  isOfficialUser
};
