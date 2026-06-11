import type { MediaEncoderApi } from './index'

declare global {
  interface Window {
    mencoder: MediaEncoderApi
  }
}

export {}
