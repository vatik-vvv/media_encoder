import type { MediaEncoderApi } from '../../preload/index'

declare global {
  interface Window {
    mencoder: MediaEncoderApi
  }
}

export {}
