export const icons = {
  profile: '/assets/stuff/icon_profile.png',
  ankets: '/assets/stuff/icon_ankets.png',
  handshake: '/assets/stuff/icon_handshake.png',
  logo: '/assets/stuff/logo.png',
  networkButton: '/assets/stuff/сеть_из_людей_для_кнопки.png',
  networkButtonVideo: '/assets/stuff/сеть_из_людей_для_кнопки_видео.mp4',
  background: '/assets/stuff/background.jpg'
}

export const getIcon = (name) => icons[name] || icons.logo

