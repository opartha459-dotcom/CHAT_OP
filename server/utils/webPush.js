const webpush = require('web-push');
const User = require('../models/User');

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BCkh2KbnlkCqU59oKsXJ2ZndtUlv5-RTZOM410vuuSWQelk4Wg_1oBGcP0IWp890mQ0LTGoFu28dWfLeO4wfuX8';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'V_w9YR3JS4WKrmLOacJ-wQuTaP1x8ZtGRXNbo-I1mxM';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@pulsechat.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[WebPush] VAPID configuration error:', err);
}

/**
 * Returns the VAPID Public Key for client subscription
 */
const getVapidPublicKey = () => {
  return VAPID_PUBLIC_KEY;
};

/**
 * Send an incoming call push notification to a user's devices (wakes up phone when app is closed)
 */
const sendCallPushNotification = async (targetUserId, callData) => {
  if (!targetUserId) return;

  try {
    const user = await User.findById(targetUserId).select('pushSubscriptions username nickname');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      type: 'incoming_call',
      callId: callData.callId,
      conversationId: callData.conversationId,
      callType: callData.callType || 'video',
      callerName: callData.callerName || 'PulseChat User',
      callerAvatar: callData.callerAvatar || '',
      callerId: callData.callerId || '',
      isGroup: !!callData.isGroup,
      timestamp: Date.now()
    });

    const options = {
      TTL: 60, // 60 seconds time-to-live for live call alerts
      urgency: 'high'
    };

    const expiredEndpoints = [];

    await Promise.allSettled(
      user.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
              }
            },
            payload,
            options
          );
        } catch (err) {
          // If status is 404 or 410, subscription is no longer valid (e.g. app uninstalled or cleared)
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.warn('[WebPush] Error sending push to device:', err.message);
          }
        }
      })
    );

    // Clean up expired subscriptions if any
    if (expiredEndpoints.length > 0) {
      await User.findByIdAndUpdate(targetUserId, {
        $pull: {
          pushSubscriptions: { endpoint: { $in: expiredEndpoints } }
        }
      });
    }
  } catch (err) {
    console.error('[WebPush] sendCallPushNotification failed:', err);
  }
};

module.exports = {
  getVapidPublicKey,
  sendCallPushNotification
};
