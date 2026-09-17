import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, SimpleGrid, TextInput, Title, Text } from '@mantine/core'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  getRichTextPlainText,
  RichTextEditorField,
  SidebarFormLayout,
} from '@shared/components'

const TIPS = [
  'Search before you create — duplicates block the operator at the hub.',
  'Fields marked * are required.',
  'Changes are logged to the audit trail with your name.',
]

const TRIGGERS = [
  'Swap completed',
  'Payment completed',
  'Plan expires in 24h',
  'Reservation created',
  'Sign-up / login',
  'Renewal debit failed',
  'Credit lifecycle',
]

const LANGUAGES = ['English']
// Post-MVP: Pidgin, Yoruba, Hausa — KURA ConfigVersion packs, not AT language API.

/** Full-bleed Add New Template — SidebarFormLayout + TipTap message (NHEF). */
export function TemplateFormPanel() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const plainLen = getRichTextPlainText(message).length

  return (
    <>
      <SidebarFormLayout
        sidebarTitle="Add New Template"
        sidebarSubtitle="Shortcode, menus & message templates"
        sidebarTips={TIPS}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={() => navigate('/ussd')}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={() => navigate('/ussd')}
            submitLabel="Submit"
            submitType="button"
            onSubmitClick={() => setSaved(true)}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            Add New Template
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Fill in the details below. Required fields are marked with an asterisk.
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput label="Template Name" placeholder="Enter template name" required />
          <Select
            label="Trigger Event"
            placeholder="Select an option"
            data={TRIGGERS}
            required
            searchable
          />
          <Select
            label="Language"
            placeholder="Select an option"
            data={LANGUAGES}
            required
            searchable
          />
        </SimpleGrid>

        <div className="flex flex-col gap-1.5">
          <Text size="sm" fw={600} className="text-[var(--tx)]">
            Message <span className="text-[#C0392B]">*</span>
          </Text>
          <RichTextEditorField
            value={message}
            onChange={setMessage}
            placeholder="Max 160 characters"
            minHeight={140}
            maxHeight={220}
          />
          <Text size="xs" c={plainLen > 160 ? 'red' : 'dimmed'}>
            {plainLen}/160
          </Text>
        </div>
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          navigate('/ussd')
        }}
        mode="saved"
        title="Template draft saved"
        description="Draft until published. Gateway: Africa’s Talking."
        actionLabel="Back to USSD"
      />
    </>
  )
}
