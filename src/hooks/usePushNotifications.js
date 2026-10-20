import { useEffect, useRef } from 'react'
import { getFirebaseMessaging, getToken, onMessage } from '../lib/firebase'

const SUPABASE_URL = 'https://njkxzbwzmhovuzuoyndj.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa3h6Ynd6bWhvdnV6dW95bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTgxOTgsImV4cCI6MjA5MTUzNDE5OH0.FmZldAabAE5Ac9YebKfiwwtzlC6ScRL77wJhTgZ6hjk'

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
// You must generate this in Firebase Console and paste it here
const VAPID_KEY = 'BIu_PLACEHOLDER_REPLACE_WITH_REAL_VAPID_KEY'

async function saveTokenToServer(firebaseUser, fcmToken) {
  try {
    const idToken = await firebaseUser.getIdToken()
    await fetch(`${SUPABASE_URL}/functions/v1/training-review/save-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ fcm_token: fcmToken }),
    })
  } catch (e) {
    console.warn('Failed to save FCM token:', e)
  }
}

export function usePushNotifications(user, onReviewMessage) {
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!user || registeredRef.current) return

    async function setup() {
      try {
        // Request notification permission (for ALL notifications)
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const messaging = getFirebaseMessaging()
        if (!messaging) return

        // Register service worker
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

        const fcmToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        })

        if (fcmToken) {
          await saveTokenToServer(user, fcmToken)
          registeredRef.current = true
        }

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          if (payload.data?.type === 'review_request' && onReviewMessage) {
            onReviewMessage(payload.data)
          }
        })
      } catch (e) {
        console.warn('Push setup error:', e)
      }
    }

    setup()
  }, [user, onReviewMessage])
}
