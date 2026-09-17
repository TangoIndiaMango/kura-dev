import { useEffect, useMemo } from 'react'
import { RichTextEditor, Link } from '@mantine/tiptap'
import { useEditor } from '@tiptap/react'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import SubScript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import '@mantine/tiptap/styles.css'

interface RichTextEditorFieldProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  onBlur?: (value: string) => void
  minHeight?: number
  /** Caps the editable area and scrolls overflow instead of growing the page. */
  maxHeight?: number
}

export function RichTextEditorField({
  value = '',
  onChange,
  placeholder = 'Body',
  onBlur,
  minHeight = 160,
  maxHeight,
}: RichTextEditorFieldProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({ link: false }),
      Underline,
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder],
  )

  const editor = useEditor(
    {
      extensions,
      content: value,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      onUpdate: ({ editor: currentEditor }) => {
        onChange?.(currentEditor.getHTML())
      },
      onBlur: ({ editor: currentEditor }) => {
        onBlur?.(currentEditor.getHTML())
      },
    },
    [extensions],
  )

  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const currentContent = editor.getHTML()
    if (value !== currentContent && value !== editor.getText()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor || editor.isDestroyed) {
    return null
  }

  return (
    <RichTextEditor editor={editor} className="overflow-hidden">
      <RichTextEditor.Toolbar sticky stickyOffset={0}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.Underline />
          <RichTextEditor.ClearFormatting />
          <RichTextEditor.Highlight />
          <RichTextEditor.Code />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H1 />
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
          <RichTextEditor.H4 />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Blockquote />
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
          <RichTextEditor.Subscript />
          <RichTextEditor.Superscript />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.AlignLeft />
          <RichTextEditor.AlignCenter />
          <RichTextEditor.AlignJustify />
          <RichTextEditor.AlignRight />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content
        style={{
          minHeight,
          ...(maxHeight != null
            ? {
                height: maxHeight,
                maxHeight,
                overflowY: 'auto',
              }
            : {}),
        }}
      />
    </RichTextEditor>
  )
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getRichTextPlainText(html: string) {
  return stripHtml(html)
}

export function isRichTextEmpty(html: string) {
  return getRichTextPlainText(html).length === 0
}
