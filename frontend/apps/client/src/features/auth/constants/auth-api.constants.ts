export const AUTH_ENDPOINTS = {
  loginBegin: '/auth/login/begin/',
  otpRequest: '/auth/otp/request/',
  otpVerify: '/auth/otp/verify/',
  pinLogin: '/auth/pin/login/',
  pinSet: '/auth/pin/set/',
  pinVerify: '/auth/pin/verify/',
  me: '/auth/me/',
  tokenRefresh: '/auth/token/refresh/',
} as const

export const AUTH_CHANNEL = 'WEB' as const
