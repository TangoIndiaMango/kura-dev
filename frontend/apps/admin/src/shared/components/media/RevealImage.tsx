import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type ReactEventHandler,
} from 'react'
import { Image, type ImageProps } from '@mantine/core'

type RevealImageProps = ImageProps &
  Pick<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'className'> & {
    src: string
    onLoad?: ReactEventHandler<HTMLImageElement>
  }

export function RevealImage({
  src,
  className,
  onLoad,
  ...props
}: RevealImageProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
  }, [src])

  const reveal = () => {
    requestAnimationFrame(() => setLoaded(true))
  }

  return (
    <Image
      src={src}
      className={['reveal-image', loaded ? 'is-loaded' : null, className]
        .filter(Boolean)
        .join(' ')}
      onLoad={(event) => {
        reveal()
        onLoad?.(event)
      }}
      {...props}
    />
  )
}
