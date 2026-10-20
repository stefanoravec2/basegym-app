// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDh-FAIvJv63TJpTvwyFCLqPlniS_I1Tdg",
  authDomain: "basegym-app.firebaseapp.com",
  projectId: "basegym-app",
  storageBucket: "basegym-app.firebasestorage.app",
  messagingSenderId: "1041722587707",
  appId: "1:1041722587707:web:b99efc5f31161de2f4fa1e"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'BaseGym BB', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
  })
})
