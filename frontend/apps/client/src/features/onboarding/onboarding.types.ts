export type OnboardingStep = 'phone' | 'otp' | 'unlock' | 'pin'

export interface OnboardingState {
  step: OnboardingStep
  phone: string
  otp: string[]
  fullName: string
}
