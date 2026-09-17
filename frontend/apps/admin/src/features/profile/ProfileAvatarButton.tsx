import { useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { Camera01Icon } from 'hugeicons-react'
import { apiErrorMessage, updateAdminProfile } from '@lib/api/auth'
import { uploadMedia } from '@lib/api/media'
import { useAuth } from '../auth/AuthProvider'

function initials(first: string, last: string) {
  const a = first.charAt(0) || '?'
  const b = last.charAt(0) || ''
  return `${a}${b}`.toUpperCase()
}

export function ProfileAvatarButton({
  firstName,
  lastName,
  photoUrl,
}: {
  firstName: string
  lastName: string
  photoUrl?: string | null
}) {
  const { refreshProfile } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const shown = preview || photoUrl

  const onPick = async (file: File | undefined) => {
    if (!file || busy) return
    if (!file.type.startsWith('image/')) {
      notifications.show({ color: 'red', message: 'Choose an image file.' })
      return
    }
    setBusy(true)
    const local = URL.createObjectURL(file)
    setPreview(local)
    try {
      const uploaded = await uploadMedia(file, 'avatar')
      await updateAdminProfile({ avatar_asset_id: uploaded.id })
      await refreshProfile()
      setPreview(null)
      notifications.show({ color: 'green', message: 'Profile photo updated.' })
    } catch (err) {
      setPreview(null)
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not update profile photo'),
      })
    } finally {
      URL.revokeObjectURL(local)
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[14px] bg-[var(--bg)] text-[20px] font-bold text-[var(--mu)] disabled:opacity-60"
        aria-label="Change profile photo"
      >
        {shown ? (
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(firstName, lastName)
        )}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--pr)] text-white shadow-sm disabled:opacity-60"
        aria-label="Upload profile photo"
      >
        <Camera01Icon size={14} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onPick(e.target.files?.[0])
        }}
      />
    </div>
  )
}
